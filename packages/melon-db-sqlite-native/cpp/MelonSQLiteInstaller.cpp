#include "MelonSQLiteInstaller.h"

#include "MelonSQLiteHostObject.h"

namespace melon {

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
