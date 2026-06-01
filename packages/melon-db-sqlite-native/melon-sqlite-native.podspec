require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "melon-sqlite-native"
  s.version      = package["version"]
  s.summary      = "Melon SQLite TurboModule for React Native"
  s.homepage     = "https://github.com/melon/melon"
  s.license      = "MIT"
  s.author       = "Melon"
  s.platforms    = { :ios => "15.1" }
  # Local monorepo installs use :path in the Podfile; avoid a remote :git :tag that does not exist.
  s.source       = { :path => "." }
  s.source_files = "ios/MelonSQLite.{h,mm}"
  s.public_header_files = "ios/MelonSQLite.h"
  s.exclude_files = "ios/generated/**"
  s.libraries = "sqlite3"

  if defined?(install_modules_dependencies) != nil
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
