# coding: utf-8
task default: %w[build]

# rake build
# rake build[--force]
task :build, [:force] do |t, args|
  args.with_defaults(:force => nil)
  # read version
  require "json"
  manifest = JSON.parse(open("./src/manifest.json").read)
  version = manifest["version"]
  # generate filename
  filename = "UrlAutoRedirector-#{version}.zip"
  # check version
  Dir.chdir("dist") do
    if args[:force] != "--force"  && File.exist?(filename)
      puts "WARNING: #{filename} is existed. Please check and confirm the version number."
      exit 1
    end
  end
  sh "mkdir -p dist"
  # cleanup .DS_Store
  sh "find ./src -name .DS_Store | xargs rm"
  # zip
  sh "cd src && zip -r release.zip ."
  sh "mv src/release.zip dist/#{filename}"
end
