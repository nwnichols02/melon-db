#pragma once

#include <MelonSQLiteSpec/MelonSQLiteSpec.h>

namespace facebook::react {

/**
 * TurboModule JSI wrapper that lazily installs global.melonSqliteJsi on first
 * method dispatch (when a valid jsi::Runtime is available).
 */
class MelonSQLiteTurboModuleJSI : public NativeMelonSQLiteSpecJSI {
 public:
  explicit MelonSQLiteTurboModuleJSI(const ObjCTurboModule::InitParams &params);
};

} // namespace facebook::react
