# Avisos y licencias de terceros

El aviso de derechos reservados de [LICENSE](LICENSE) solo se aplica al contenido propio de JobRadar ATS. **No restringe las licencias ni los permisos de los componentes de terceros**, que conservan sus titulares, textos, condiciones y exenciones de responsabilidad. Tampoco revoca permisos válidamente concedidos con anterioridad.

## Plantilla Expo

La licencia MIT heredada de la plantilla, incluido el aviso de copyright de **650 Industries, Inc. (aka Expo)**, se conserva íntegra y sin modificaciones en [LICENSES/Expo-MIT.txt](LICENSES/Expo-MIT.txt). Se aplica a las partes procedentes de esa plantilla, sin atribuir a JobRadar la titularidad de ese código ni extenderla automáticamente al contenido original del proyecto.

## Componentes y recursos

| Componente                                       | Licencia y avisos                                                                                                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo y Expo Router                               | MIT; los paquetes mantienen sus respectivos avisos de copyright.                                                                                                                                                  |
| React, React Native y React Native Web           | MIT; se conservan los avisos de sus distribuciones.                                                                                                                                                               |
| Inter, de The Inter Project Authors              | SIL Open Font License 1.1, con texto completo y copyright en [assets/fonts/OFL.txt](assets/fonts/OFL.txt). Los archivos de fuente no se modifican.                                                                |
| PDF.js (`pdfjs-dist`)                            | Apache 2.0; licencia y avisos incluidos en el paquete original.                                                                                                                                                   |
| mammoth                                          | BSD 2-Clause; copyright de Michael Williamson y condiciones incluidas en el paquete original.                                                                                                                     |
| `@supabase/supabase-js`                          | MIT; copyright y licencia de Supabase incluidos en el paquete original.                                                                                                                                           |
| Material Symbols, de Google                      | Apache 2.0; el paquete `@expo-google-fonts/material-symbols` incluye `LICENSE_FONT` para la fuente y `LICENSE` para su código. En iOS se utilizan los símbolos del sistema, sin atribuir su propiedad a JobRadar. |
| `onnxruntime-web`                                | MIT; avisos de Microsoft y de otros componentes incluidos en su distribución.                                                                                                                                     |
| `@huggingface/tokenizers`                        | Apache 2.0; se mantienen los avisos de su distribución.                                                                                                                                                           |
| Modelo `multilingual-e5-small` y conversión ONNX | El modelo original de intfloat y la conversión de Xenova se identifican como MIT en sus distribuciones. Los pesos no se versionan en este repositorio; la preparación utiliza una revisión fija de la conversión. |

Este resumen no sustituye los textos completos de las licencias ni enumera exhaustivamente las dependencias transitivas. `package-lock.json` conserva sus versiones y metadatos de licencia; cada paquete mantiene los archivos `LICENSE`, `NOTICE` y demás avisos que correspondan. Las condiciones particulares de cada componente prevalecen sobre este resumen.

Al redistribuir componentes, fuentes, modelos o compilaciones que los incluyan, deben conservarse y acompañarse los textos de licencia, avisos de copyright, archivos `NOTICE` y demás atribuciones exigidas por sus respectivas licencias. El aviso del código propio no permite omitir esas obligaciones ni restringir los derechos que las licencias de terceros conceden.

El valor `UNLICENSED` en los metadatos npm se refiere al paquete propio de JobRadar y no cambia la licencia de sus dependencias. No es la licencia de dominio público «Unlicense». Para cualquier permiso sobre contenido propio, consultar [LICENSE](LICENSE).
