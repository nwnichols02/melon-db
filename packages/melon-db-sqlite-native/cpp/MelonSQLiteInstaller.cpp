#include "MelonSQLiteInstaller.h"

#include "MelonSQLiteHostObject.h"

namespace melon {

void setMelonJsScheduler(MelonJsScheduler scheduler) {
  MelonSQLiteScheduler::instance().setScheduler(std::move(scheduler));
}

void installMelonSqliteJsi(facebook::jsi::Runtime &runtime) {
  if (runtime.global().hasProperty(runtime, "melonSqliteJsi")) {
    return;
  }
  auto hostObject = createMelonSQLiteHostObject();
  runtime.global().setProperty(
      runtime,
      "melonSqliteJsi",
      facebook::jsi::Object::createFromHostObject(runtime, hostObject));
}

} // namespace melon
