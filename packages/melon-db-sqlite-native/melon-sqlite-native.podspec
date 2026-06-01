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
  s.source       = { :git => "https://github.com/melon/melon.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm}"
  s.public_header_files = "ios/*.h"
  s.frameworks = "sqlite3"
  s.dependency "React-Core"
end
