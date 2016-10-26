# coding: utf-8
task default: %w[build]

task :build do
  require "json"
  manifest = JSON.parse(open("./src/manifest.json").read)
  version = manifest["version"]
  sh "mkdir -p dist"
  sh "cd src && zip -r release.zip ."
  sh "mv src/release.zip dist/UrlAutoRedirector-#{version}.zip"
end

task :clean do
  sh "rm src/release.zip"
end
