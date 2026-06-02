#pragma once

#include <jsi/jsi.h>

#include "MelonSQLiteScheduler.h"

namespace melon {

/**
 * Installs global.melonSqliteJsi (sync C++ JSI host object) once per runtime.
 */
void installMelonSqliteJsi(facebook::jsi::Runtime &runtime);

/**
 * Configures how native code schedules callbacks onto the JS thread.
 */
void setMelonJsScheduler(MelonJsScheduler scheduler);

} // namespace melon
