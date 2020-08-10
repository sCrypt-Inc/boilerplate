const watch = require('watch');
const { basename, join } = require('path');
const { unlinkSync } = require('fs');
const { compileContract } = require('./helper');

function compile_for(file) {
  const fileName = basename(file);
  if(fileName.endsWith('.scrypt')) {
    try {
      clean_description_file(fileName)
      compileContract(fileName);
    } catch (error) {
      console.log(error)
    }
  }
}

function clean_description_file(fileName) {
  if(fileName.endsWith('.scrypt')) {
    try {
      unlinkSync(join(__dirname, 'tests/fixture/autoGen', fileName.replace('.scrypt', '_desc.json')))
    } catch (error) {
      console.log(error)
    }
  }
}

watch.watchTree('contracts', { interval: 2 }, function (f, curr, prev) {
  if (typeof f == "object" && prev === null && curr === null) {
    // Finished walking the tree
    Object.keys(f).forEach( (file) => {
      compile_for(file)
    })
  } else if (prev === null) {
    // f is a new file
  } else if (curr.nlink === 0) {
    // f was removed
  } else {
    // f was changed
    compile_for(f)
  }
})

