const path = require('path')
const fs = require('fs');
const { 
    compileContract: compileContractImpl,
    buildContractClass
} = require('scryptlib')

const getScryptImportFile = function (scryptFile, ) {
    const data = fs.readFileSync(scryptFile, {encoding: 'utf8'})
    const scryptImportList= data.split('\n').filter(function (line) {
        // file import line
        return line.indexOf('import') !== -1 && line.indexOf('scrypt') !== -1
    })
    let scryptList = []
    for (const scryptImport of scryptImportList) {
        // extra import file
        const regExpMatchArray = scryptImport.match(/import "(\S+)";/)
        if (regExpMatchArray) {
            const fileName = regExpMatchArray[1]
            scryptList.push(fileName)
        }
    }
    return scryptList
}

const recurScryptList = function (scryptFile, fileList, filePath) {
    const newList = getScryptImportFile(scryptFile, fileList)
    if (newList.length > 0){
        for (const newListElement of newList) {
            const newFile = path.join(filePath, newListElement)
            recurScryptList(newFile, fileList, filePath)
            fileList.push(newListElement)
        }
    }
}

const scryptTreeLastChangeTime = function (scryptFile) {
    const filePath = path.dirname(scryptFile)
    const allScryptList = [
        path.basename(scryptFile)
    ]
    recurScryptList(scryptFile, allScryptList, filePath)
    const uniqueScryptList = [...new Set(allScryptList)]
    const scryptCtimeList = []
    for (const scryptFile of uniqueScryptList) {
        const fullPath = path.join(filePath, scryptFile)
        if (fs.existsSync(fullPath)) {
            const ctime = fs.statSync(fullPath).ctimeMs
            scryptCtimeList.push(ctime)
        }
    }
    return Math.max.apply(Math, scryptCtimeList)
}

function scryptMake(scryptFile, outDir, options){
    if (!outDir) {
        outDir = 'out'
    }
    const out = path.join(__dirname, outDir)
    const sourceFileLastCtime = scryptTreeLastChangeTime(scryptFile)
    const targetDescFile = `${out}/${path.basename(scryptFile).replace('.scrypt', '_desc.json')}`
    let descLastCtime = 0
    if (fs.existsSync(targetDescFile)) {
        descLastCtime = fs.statSync(targetDescFile).ctimeMs
    }
    let descObj
    if (sourceFileLastCtime > descLastCtime) {
        console.log('Should recompile source file.')
        descObj = compileContractImpl(scryptFile, options ? options: {out: out});
    } else {
        console.log('Source file not change while use old desc file.')
        descObj = JSON.parse(fs.readFileSync(targetDescFile, 'utf8'))
    }
    return descObj
}

module.exports = {
    scryptMake
}
