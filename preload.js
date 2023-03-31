const { exec } = require("child_process");
const iconv = require('iconv-lite');

var encoding = 'cp936'
var binaryEncoding = 'binary'

utools.onPluginEnter(({ code, type, payload }) => {
    console.log('onPluginEnter', code, type, payload)
    utools.hideMainWindow()
    if (code == 'url') {
        exec('markurl' + ' ' + payload, { encoding: binaryEncoding }, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                utools.copyText(error.message)
                utools.showNotification(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                utools.copyText(stderr)
                utools.showNotification(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            // convert stdout to utf8
            let output = iconv.decode(new Buffer(stdout, binaryEncoding), encoding);
            utools.copyText(output);
            utools.showNotification('Markdown已复制到剪贴板\n' + output);
            utools.outPlugin()
        });
    } else if (code == 'title') {
        utools.showNotification('正在查询……')
        exec('markurl' + ' -t ' + payload, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                utools.copyText(error.message)
                utools.showNotification(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                utools.copyText(stderr)
                utools.showNotification(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            // convert stdout to utf8
            let output = iconv.decode(new Buffer(stdout, binaryEncoding), encoding);
            utools.copyText(output);
            utools.showNotification('Markdown已复制到剪贴板\n' + output);
            utools.outPlugin()
        });
    }
})
