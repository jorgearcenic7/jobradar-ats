"""Prueba el Python real del workflow, sin secretos ni peticiones externas."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock, patch
import urllib.error
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github/workflows/supabase-availability.yml'
KEY = 'sb_publishable_fixture_not_a_real_key'
URL = 'https://fixture.supabase.co'


class Response:
    def __init__(self, status=200, body=b'1', content_type='application/json'):
        self.status = status
        self.body = body
        self.headers = {'Content-Type': content_type}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def read(self, size):
        return self.body[:size]


class AvailabilityWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Se usa el lector YAML ya instalado con las herramientas del proyecto.
        raw = subprocess.check_output([
            'node', '-e',
            "const fs=require('node:fs');const yaml=require('js-yaml');"
            "process.stdout.write(JSON.stringify(yaml.load(fs.readFileSync(process.argv[1],'utf8'))));",
            str(WORKFLOW),
        ], cwd=ROOT)
        cls.workflow = json.loads(raw)
        run = cls.workflow['jobs']['availability']['steps'][0]['run']
        cls.source = run.split("python3 - <<'PY'\n", 1)[1].rsplit('\nPY', 1)[0]
        cls.code = compile(cls.source, str(WORKFLOW), 'exec')

    def probe(self, responses=(), env=None):
        opener = Mock()
        opener.open.side_effect = list(responses)
        output = io.StringIO()
        namespace = {}
        settings = {'SUPABASE_URL': URL, 'SUPABASE_PUBLISHABLE_KEY': KEY}
        if env:
            settings.update(env)
        with patch.dict(os.environ, settings, clear=True), \
                patch('urllib.request.build_opener', return_value=opener) as build, \
                patch('time.sleep') as sleep, contextlib.redirect_stdout(output):
            with self.assertRaises(SystemExit) as stopped:
                exec(self.code, namespace)
        return stopped.exception.code, output.getvalue(), opener, build, sleep, namespace

    def assert_safe_output(self, output):
        for sensitive in [KEY, URL, 'fixture-private-body', 'Authorization', 'apikey']:
            self.assertNotIn(sensitive, output)

    def test_minimal_workflow_contract(self):
        self.assertEqual(set(self.workflow['on']), {'schedule', 'workflow_dispatch'})
        self.assertEqual(self.workflow['on']['schedule'], [{'cron': '17 7 * * *'}])
        self.assertEqual(self.workflow['permissions'], {})
        job = self.workflow['jobs']['availability']
        self.assertEqual(job['runs-on'], 'ubuntu-latest')
        self.assertEqual(job['timeout-minutes'], 2)
        self.assertEqual(len(job['steps']), 1)
        step = job['steps'][0]
        self.assertNotIn('uses', step)
        self.assertEqual(step['env'], {
            'SUPABASE_URL': '${{ secrets.SUPABASE_URL }}',
            'SUPABASE_PUBLISHABLE_KEY': '${{ secrets.SUPABASE_PUBLISHABLE_KEY }}',
        })

    def test_success_uses_only_get_and_publishable_header(self):
        code, output, opener, build, sleep, namespace = self.probe([Response()])
        self.assertEqual(code, 0)
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, URL + '/rest/v1/rpc/availability_probe')
        self.assertEqual(request.get_method(), 'GET')
        self.assertEqual(dict(request.header_items()), {
            'Apikey': KEY, 'Accept': 'application/json',
        })
        self.assertEqual(opener.open.call_args.kwargs, {'timeout': 15})
        handler = build.call_args.args[0]
        self.assertIsInstance(handler, namespace['NoRedirect'])
        self.assertIsNone(handler.redirect_request(request, None, 302, '', {}, 'https://other.test'))
        sleep.assert_not_called()
        self.assert_safe_output(output)

    def test_json_charset_and_surrounding_whitespace_are_valid(self):
        self.assertEqual(self.probe([Response(body=b' 1\n', content_type='application/json; charset=utf-8')])[0], 0)

    def test_invalid_status_body_or_content_type_fails_without_logging_response(self):
        cases = [Response(status=status) for status in [201, 204, 301, 302, 400, 401, 404, 429, 503]]
        cases += [Response(body=body) for body in [
            b'true', b'1.0', b'"1"', b'[1]', b'{}', b'null', b'2', b'1 trailing',
            b'fixture-private-body', b'\xff', b' ' * 65 + b'1',
        ]]
        cases += [Response(content_type='text/html')]
        for response in cases:
            with self.subTest(status=response.status, content_type=response.headers['Content-Type'], body_length=len(response.body)):
                code, output, opener, _, sleep, _ = self.probe([response, response])
                self.assertEqual(code, 1)
                self.assertIn('::error::', output)
                self.assertEqual(opener.open.call_count, 2)
                sleep.assert_called_once_with(2)
                self.assert_safe_output(output)

    def test_transient_failure_recovers_once(self):
        error = urllib.error.URLError(URL + KEY + 'fixture-private-body')
        code, output, opener, _, sleep, _ = self.probe([error, Response()])
        self.assertEqual(code, 0)
        self.assertEqual(opener.open.call_count, 2)
        self.assertNotIn('::error::', output)
        sleep.assert_called_once_with(2)
        self.assert_safe_output(output)

    def test_network_and_http_errors_fail_without_exception_details(self):
        for error in [
            TimeoutError(URL + KEY),
            urllib.error.URLError(URL + KEY),
            urllib.error.HTTPError(URL, 401, KEY + 'fixture-private-body', {}, None),
        ]:
            with self.subTest(error_type=type(error).__name__):
                code, output, opener, _, _, _ = self.probe([error, error])
                self.assertEqual(code, 1)
                self.assertEqual(opener.open.call_count, 2)
                self.assert_safe_output(output)

    def test_invalid_configuration_never_sends_a_request(self):
        for env in [
            {'SUPABASE_URL': ''}, {'SUPABASE_PUBLISHABLE_KEY': ''},
            {'SUPABASE_URL': 'http://fixture.supabase.co'},
            {'SUPABASE_URL': URL + '/rest/v1'},
            {'SUPABASE_URL': URL + '?key=fixture-private-body'},
            {'SUPABASE_URL': 'https://user:pass@fixture.supabase.co'},
            {'SUPABASE_URL': 'https://other.test'},
            {'SUPABASE_PUBLISHABLE_KEY': 'sb_' + 'secret_fixture'},
            {'SUPABASE_PUBLISHABLE_KEY': KEY + '\r\nextra-header'},
        ]:
            with self.subTest(setting=list(env)):
                code, output, opener, build, _, _ = self.probe(env=env)
                self.assertEqual(code, 1)
                build.assert_not_called()
                opener.open.assert_not_called()
                self.assert_safe_output(output)


if __name__ == '__main__':
    unittest.main()
