#pragma once

#include <jsi/jsi.h>

namespace melon {

/**
 * Installs global.melonSqliteJsi (sync C++ JSI host object) once per runtime.
 */
void installMelonSqliteJsi(facebook::jsi::Runtime &runtime);

} // namespace melon
