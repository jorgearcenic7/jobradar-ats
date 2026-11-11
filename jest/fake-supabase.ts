/*
Cliente de Supabase falso para las pruebas de «Mis CV».

Imita solo lo que usa `cv-library.ts`: la tabla `cvs` de una cuenta, el bucket `cvs` y la sesión.
Reproduce las reglas del servidor que importan al cliente (ruta calculada, límite de 20 CV,
errores con mensajes internos) y permite forzar fallos. No sustituye a la prueba real de RLS de
`supabase/tests/my_cvs_isolation.sql`: aquí no hay otras cuentas.
*/
import type { SupabaseClient } from '@supabase/supabase-js';

type Row = {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  format: 'pdf' | 'docx';
  byte_size: number;
  page_count: number | null;
  cv_text: string;
  file_path: string;
  created_at: string;
};

type Failure = { code?: string; message: string };
type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upload' | 'remove';

class Query {
  operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  values: Partial<Row> = {};
  filters: [keyof Row, unknown][] = [];
  mode: 'many' | 'single' | 'maybe' = 'many';

  constructor(private readonly fake: FakeSupabase) {}

  select() {
    return this;
  }
  insert(values: Partial<Row>) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }
  update(values: Partial<Row>) {
    this.operation = 'update';
    this.values = values;
    return this;
  }
  delete() {
    this.operation = 'delete';
    return this;
  }
  eq(column: keyof Row, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  order() {
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }
  then<T>(resolve: (value: { data: unknown; error: Failure | null }) => T, reject?: () => void) {
    return Promise.resolve(this.fake.run(this)).then(resolve, reject);
  }
}

export class FakeSupabase {
  rows: Row[] = [];
  objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  /** Orden de las operaciones, para comprobar qué se hizo y en qué orden. */
  log: string[] = [];
  sessionUserId: string | null;
  /** Simula un `remove` que responde sin error pero no borra el archivo. */
  silentRemove = false;
  private failures = new Map<Operation, Failure>();
  private nextId = 1;

  constructor(userId: string | null) {
    this.sessionUserId = userId;
  }

  /** La próxima operación de ese tipo devuelve este error. */
  failNext(operation: Operation, failure: Failure = { message: 'internal detail' }) {
    this.failures.set(operation, failure);
  }

  /** Añade un CV guardado directamente, como si existiera en el servidor. */
  seed(values: Partial<Row> & Pick<Row, 'title'>) {
    const id = values.id ?? `cv-${this.nextId++}`;
    const row: Row = {
      user_id: this.sessionUserId ?? 'nobody',
      file_name: `${values.title}.pdf`,
      format: 'pdf',
      byte_size: 1024,
      page_count: 1,
      cv_text: `Texto ficticio de ${values.title}.`,
      created_at: '2026-11-11T10:00:00Z',
      ...values,
      id,
      file_path: `${values.user_id ?? this.sessionUserId}/${id}.${values.format ?? 'pdf'}`,
    };
    this.rows.unshift(row);
    return row;
  }

  private takeFailure(operation: Operation) {
    const failure = this.failures.get(operation) ?? null;
    this.failures.delete(operation);
    return failure;
  }

  run(query: Query): { data: unknown; error: Failure | null } {
    this.log.push(query.operation);
    const failure = this.takeFailure(query.operation);
    if (failure) return { data: null, error: failure };
    const matches = (row: Row) =>
      row.user_id === this.sessionUserId &&
      query.filters.every(([column, value]) => row[column] === value);

    switch (query.operation) {
      case 'insert': {
        // El mismo CHECK que `cvs_byte_size_check` en la migración.
        const byteSize = query.values.byte_size;
        if (typeof byteSize !== 'number' || byteSize < 1 || byteSize > 10_485_760) {
          return { data: null, error: { code: '23514', message: 'cvs_byte_size_check' } };
        }
        if (this.rows.filter((row) => row.user_id === this.sessionUserId).length >= 20) {
          return { data: null, error: { code: 'P0001', message: 'cv_limit_reached' } };
        }
        const row = this.seed({ ...(query.values as Row), user_id: this.sessionUserId! });
        return { data: row, error: null };
      }
      case 'update': {
        const updated = this.rows.filter(matches);
        updated.forEach((row) => Object.assign(row, query.values));
        return { data: updated.map(({ id }) => ({ id })), error: null };
      }
      case 'delete':
        // Como el trigger `cvs_prevent_delete_with_file`: no se borra una fila con su archivo.
        if (this.rows.some((row) => matches(row) && this.objects.has(row.file_path))) {
          return { data: null, error: { code: 'P0001', message: 'cv_file_still_exists' } };
        }
        this.rows = this.rows.filter((row) => !matches(row));
        return { data: null, error: null };
      case 'select': {
        const found = this.rows.filter(matches);
        if (query.mode === 'many') return { data: found, error: null };
        return { data: found[0] ?? null, error: null };
      }
    }
  }

  readonly client = {
    auth: {
      getSession: async () => ({
        data: { session: this.sessionUserId ? { user: { id: this.sessionUserId } } : null },
        error: null,
      }),
    },
    from: () => new Query(this),
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array, options?: { contentType?: string }) => {
          this.log.push('upload');
          const error = this.takeFailure('upload');
          if (!error) this.objects.set(path, { bytes, contentType: options?.contentType });
          return { data: error ? null : { path }, error };
        },
        remove: async (paths: string[]) => {
          this.log.push('remove');
          const error = this.takeFailure('remove');
          if (!error && !this.silentRemove) paths.forEach((path) => this.objects.delete(path));
          return { data: error ? null : [], error };
        },
      }),
    },
  } as unknown as SupabaseClient;
}
