const fs = require('fs')
const core = require('@actions/core');

function generateReleaseNotes(branchDiffFile, projectKeys, createReleaseUrl) {
  const data = fs.readFileSync(branchDiffFile, 'utf8');
  const lines = data.split(/\r?\n/);

  console.log("Project keys: " + projectKeys);
  console.log("Lines: " + lines.length);

  const regExps = [];
  for (const projectKey of projectKeys) {
    regExps.push(new RegExp(`${projectKey}-([0-9]*)`))
  }

  const tickets = {};
  let isFeatureChange = false;

  for (const line of lines) {
    if (line.includes('[FEATURE]')) {
      isFeatureChange = true;
    }

    const words = line.trim().split(" ");

    for (const word of words) {
      for (const re of regExps) {
        const r = word.trim().match(re);

        if (r) {
          tickets[r[0]] = true;
        }
      }
    }
  }

  const ticketIds = Object.keys(tickets);
  console.log("Detected tickets: " + JSON.stringify(ticketIds));

  let releaseNotes = "## Change type\n";
  if (isFeatureChange) {
    releaseNotes += "**Minor** change\n"
  } else{
    releaseNotes += "**Patch** change\n"
  }

  releaseNotes += "## Changes\n";
  for (const ticketId of ticketIds) {
    releaseNotes += `- ${ticketId}\n`;
  }

  if (!!createReleaseUrl) {
    let createRelease = createReleaseUrl + "&issuelinks-linktype=releases&issuelinks-issues=DELETE";

    for (const ticketId of ticketIds) {
      createRelease += `&issuelinks-issues=${ticketId}`
    }

    releaseNotes += `\n## Links\n`;
    releaseNotes += `- [Create Release Ticket](${encodeURI(createRelease)})`;
  }

  return releaseNotes;
}

async function run() {
  try {
    const branchDiffFile = core.getInput('branch-diff-file', {required: true});
    const projectKey = core.getInput('jira-project-key', {required: true});
    const createReleaseUrl = core.getInput('jira-url', {required: false});

    const releaseNotes = generateReleaseNotes(branchDiffFile, projectKey.split(","), createReleaseUrl);
    core.setOutput('release-notes', releaseNotes);
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run()
