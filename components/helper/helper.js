const fs = require('fs-extra');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const path = require('path');

async function getName(ctx) {
    var name = await clearHTML(ctx.from.first_name)
    var userID = ctx.from.id;
    var username = ctx.from.username;

    var p = username ? `@${username}` : `<a href='tg://user?id=${userID}'>${name}</a>`
    return p;
}

async function clearHTML(s) {
    if (!s) return s
    return s
        .replace(/</g, '')
        .replace(/>/g, '')
}

async function createID(length) {
    var result = [];
    var panjangKode = Number(length);
    var characters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var panjangkarakter = characters.length;

    for (var i = 0; i < panjangKode; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * panjangkarakter)));
    }

    var r = result.join("");
    return r;
}

function writeContactsToVCF(contacts, vcfFilePath, customName) {
    var datas = ''

    contacts.map((contact, index) => {
        if (customName) { var nms = `${customName} ${index + 1}` } else { var nms = contact.name ? contact.name : `Contact ${index + 1}` }

        datas += `BEGIN:VCARD\n`
        datas += `VERSION:3.0\n`
        datas += `N:${nms}\n`
        datas += `TEL;TYPE=CELL:${contact.phone}\n`
        datas += `END:VCARD\n`;
    })

    fs.appendFileSync(vcfFilePath, datas + '\n');
}

function getNewVcfFilePath(vcfFilePath, count, prop, chatID, IDs) {
    var ext = path.extname(vcfFilePath);
    var base = path.basename(vcfFilePath, ext);
    var dir = path.dirname(vcfFilePath);

    var customFile = prop.get(`custom_file_` + IDs + chatID)
    var files = customFile ? `${customFile}_${count}` : `${base}_${count}`

    return path.join(dir, `${files}${ext}`);
}

async function convertCSVtoVCF(csvFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    var customIndex = prop.get(`custom_index_` + IDs + chatID)
    var fileCount = customIndex ? Number(customIndex) : 1
    var generatedFiles = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                contacts.push(row);
                if (contacts.length === maxContacts) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
                    writeContactsToVCF(contacts, newVcfFilePath, customName);
                    generatedFiles.push(newVcfFilePath);
                    contacts.length = 0;
                    fileCount++;
                }
            })
            .on('end', () => {
                if (contacts.length > 0) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
                    writeContactsToVCF(contacts, newVcfFilePath, customName);
                    generatedFiles.push(newVcfFilePath);
                }
                resolve(generatedFiles);
            })
            .on('error', reject);
    });
}

async function convertTXTtoVCF(txtFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    var customIndex = prop.get(`custom_index_` + IDs + chatID)
    var fileCount = customIndex ? Number(customIndex) : 1
    var generatedFiles = [];

    var data = await fs.readFile(txtFilePath, 'utf-8');
    var lines = data.split('\n');

    lines.forEach((line, index) => {
        var [name, phone] = line.split(',');

        if (!phone) {
            var toNumber = Number(name)
            if (isNaN(toNumber) == false) {
                var phn = name
            } else {
                var phn = ''
            }
        } else {
            var phn = phone
        }

        if ((!name && customName) || (name && customName)) {
            var nms = customName
        } else if (name && !customName) {
            var nms = name
        } else if (!name && !customName) {
            var nms = `Contact ${index + 1}`
        }

        var contact = {
            name: nms,
            phone: phn
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
            writeContactsToVCF(contacts, newVcfFilePath, customName);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
        writeContactsToVCF(contacts, newVcfFilePath, customName);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

async function convertXLSXtoVCF(xlsxFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    var customIndex = prop.get(`custom_index_` + IDs + chatID)
    var fileCount = customIndex ? Number(customIndex) : 1
    var generatedFiles = [];

    var workbook = xlsx.readFile(xlsxFilePath);
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    rows.forEach((row, index) => {
        var [name, phone] = row;
        if (!phone) {
            var toNumber = Number(name)
            if (isNaN(toNumber) == false) {
                var phn = name
            } else if (String(name).startsWith('+')) {
                var phn = name
            } else {
                var phn = ''
            }
        } else {
            var phn = phone
        }

        console.log(customName)
        if ((!name && customName) || (name && customName)) {
            var nms = customName
        } else if (name && !customName) {
            var nms = name
        } else if (!name && !customName) {
            var nms = `Contact ${index + 1}`
        }

        var contact = {
            name: nms,
            phone: phn
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
            writeContactsToVCF(contacts, newVcfFilePath, customName);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
        writeContactsToVCF(contacts, newVcfFilePath, customName);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

async function splitVCF(filePath, fileName, chunkSize, prop, chatID, IDs) {
    var content = fs.readFileSync(filePath, 'utf-8')
    var vcards = content.split(/(?=BEGIN:VCARD)/).filter(Boolean);
    var chunks = [];

    for (let i = 0; i < vcards.length; i += chunkSize) {
        chunks.push(vcards.slice(i, i + chunkSize).join(''));
    }

    var cusFile = prop.get(`custom_file_` + IDs + chatID) ? prop.get(`custom_file_` + IDs + chatID) : fileName
    var outputDir = 'downloads'
    var filePaths = []
    chunks.forEach((chunk, index) => {
        var fileName = path.join(outputDir, `${cusFile.replace(/\.vcf/i, '')} ${index + 1}.vcf`);
        fs.writeFileSync(fileName, chunk);
        filePaths.push(fileName);
    });
    return filePaths;
}

async function sendFile(fileExist, filePath, ctx, message_id, type, extensi, doc, chatID, IDs, prop) {
    var fileLength = fileExist.length
    var count = 0
    if (type !== 'trimVcf') {
        if (fileLength == 1) {
            var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi ${doc[1]} ke ${extensi}.`
        } else {
            var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi semua file ke ${extensi}.`
        }
    } else {
        if (fileLength == 1) {
            var caps = `✅ <b>Well Done!</b>\nBerhasil membagi ${doc[1]} menjadi ${fileLength} file.`
        } else {
            var caps = `✅ <b>Well Done!</b>\nBerhasil membagi semua file menjadi ${fileLength} file.`
        }
    }

    await fs.remove(filePath)
    for (const file of fileExist) {
        count++;
        if (fileLength == 1) {
            await ctx.replyWithDocument({ source: file }, { caption: caps, parse_mode: 'HTML' });
        } else {
            if (count == fileLength) {
                await ctx.replyWithDocument({ source: file }, { caption: caps, parse_mode: 'HTML' });
            } else {
                await ctx.replyWithDocument({ source: file }, { parse_mode: 'HTML' });
            }
        }
        await fs.remove(file)
    }
    try { await ctx.deleteMessage(message_id) } catch { }
    prop.read(`skipMaxContacts_` + IDs + chatID)
    prop.read(`skipFileNames_` + IDs + chatID)
    prop.read(`skipCustomName_` + IDs + chatID)
    prop.read(`skipCustomIndex_` + IDs + chatID)
}

const helper = {
    convertCSVtoVCF,
    convertTXTtoVCF,
    convertXLSXtoVCF,
    splitVCF,
    sendFile,
    getName,
    clearHTML,
    createID
}
module.exports = helper