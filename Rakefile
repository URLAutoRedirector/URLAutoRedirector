# coding: utf-8
task default: %w[build]

task :build do
  sh "cd src && zip -r release.zip ."
end

task :clean do
  sh "rm src/release.zip"
end
