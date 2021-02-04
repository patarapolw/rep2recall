// @ts-check
const fs = require('fs')
const glob = require('fast-glob')

process.chdir(process.env.BACKUP_ROOT)

let exitStatus = 1

const [latest, ...recentList] = glob.sync('*.tar.gz').sort().reverse()
const latestCtime = fs.statSync(latest).ctimeMs

let prevCtime = latestCtime
for (const f of recentList) {
  const ctime = fs.statSync(f).ctimeMs

  if (latestCtime - ctime < 1000 * 60 * 60 * 24) {

  } else if (prevCtime - ctime < 1000 * 60 * 60 * 24) {
    console.log(`Deleting ${f}`)
    fs.unlinkSync(f)
    exitStatus = 0
  } else if (latestCtime - ctime < 1000 * 60 * 60 * 24 * 180) {
    console.log(`Deleting ${f}`)
    fs.unlinkSync(f)
    exitStatus = 0
  }

  prevCtime = ctime
}

process.exit(exitStatus)
