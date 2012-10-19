fs = require 'fs'

{print} = require 'sys'
{spawn} = require 'child_process'

build = (callback) ->
  coffeeDirs = [
    'shared/coffee', 
    'smartboard/coffee'
  ]

  for dir in coffeeDirs
    coffee = spawn 'coffee', ['-c', '-o', dir.replace(/coffee$/,'js'), dir]

    # coffeeMap = spawn 'coffee', ['--source-map', '-i', 'coffee/patchworker.coffee']
    # coffeeMap.stderr.on 'data', (data) ->
    #   process.stderr.write data.toString()
    # coffeeMap.stdout.on 'data', (data) ->
    #   data = data.toString().replace(/coffee\//g, '../coffee/')
    #   fs.writeFile "js/patchworker.js.map", data, (err) ->
    #       process.stderr.write err if err
    # coffeeMap.on 'exit', (code) ->
    #   callback?() if code is 0
    
    # coffee = spawn 'coffee', ['--js', '-i', 'coffee/patchworker.coffee']
    coffee.stderr.on 'data', (data) ->
      process.stderr.write data.toString()
    # coffee.stdout.on 'data', (data) ->
    #   data = data + "\n\n//@ sourceMappingURL=patchworker.js.map\n"
    #   fs.writeFile "js/patchworker.js", data, (err) ->
    #       process.stderr.write err if err
    coffee.on 'exit', (code) ->
      callback?() if code is 0
  

task 'build', 'Compile coffee/* to js/*', ->
  build()
task 'sbuild', 'Compile coffee/* to js/* using Sublime Text', ->
  build()