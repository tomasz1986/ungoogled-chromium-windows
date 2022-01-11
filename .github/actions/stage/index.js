const core = require('@actions/core');
const io = require('@actions/io');
const exec = require('@actions/exec');
const artifact = require('@actions/artifact');
const glob = require('@actions/glob');

async function run() {
    process.on('SIGINT', function() {
    })
    const finished = core.getBooleanInput('finished', {required: true});
    const from_artifact = core.getBooleanInput('from_artifact', {required: true});
    console.log(`finished: ${finished}, artifact: ${from_artifact}`);
    if (finished) {
        core.setOutput('finished', true);
        return;
    }

    const artifactClient = artifact.create();

    if (from_artifact) {
        await artifactClient.downloadArtifact('build-artifact', 'C:\\ungoogled-chromium-windows\\build');
        await exec.exec('7z', ['x', 'C:\\ungoogled-chromium-windows\\build\\artifacts.zip',
            '-oC:\\ungoogled-chromium-windows\\build', '-y']);
        await io.rmRF('C:\\ungoogled-chromium-windows\\build\\artifacts.zip');
    }

    const retCode = await exec.exec('python', ['build.py'], {
        cwd: 'C:\\ungoogled-chromium-windows',
        ignoreReturnCode: true
    });
    if (retCode === 0) {
        core.setOutput('finished', true);
        const globber = await glob.create('C:\\ungoogled-chromium-windows\\build\\ungoogled-chromium*',
            {matchDirectories: false});
        await artifactClient.uploadArtifact('chromium', await globber.glob(),
            'C:\\ungoogled-chromium-windows\\build', {retentionDays: 1});
    } else {
        await exec.exec('7z', ['a', '-tzip', 'C:\\ungoogled-chromium-windows\\artifacts.zip',
            'C:\\ungoogled-chromium-windows\\build\\src', '-mx=3', '-mtc=on'], {ignoreReturnCode: true});
        await artifactClient.uploadArtifact('build-artifact', ['C:\\ungoogled-chromium-windows\\artifacts.zip'],
            'C:\\ungoogled-chromium-windows', {retentionDays: 1});
        core.setOutput('finished', false);
    }
}

run().catch(err => core.setFailed(err.message));