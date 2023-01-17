#!/usr/bin/env zx

import fs from 'fs-extra'
import { $, cd } from 'zx'

await $`git clone --branch master --depth 1 --no-checkout --filter=blob:limit=100k https://ese.tjadataba.se/ESE/ESE.git .working`

cd('.working')

await $`git remote remove origin`

await $`git checkout`

const { stdout: parsed } = await $`git rev-parse HEAD`
const [commit] = parsed.split('\n')

const { stdout: tree } = await $`git ls-tree -r -z HEAD`
const blobs = tree
    .split('\0')
    .filter((line) => !!line)
    .map(parseTreeEntry)
    .filter((entry) => entry.type === 'blob')

const levels = blobs
    .map((blob) => blob.path)
    .filter((path) => path.endsWith('.tja'))
    .filter(
        (path) =>
            !['08 Live Festival Mode', '10 Taiko Towers', '11 Dan Dojo'].some(
                (name) => path.includes(name)
            )
    )
    .map((path) => ({ path, ...readTjaMeta(path) }))

cd('..')

fs.outputJsonSync(
    'public/database.json',
    { commit, blobs, levels },
    { spaces: 4 }
)

function parseTreeEntry(line) {
    const index = line.indexOf('\t')

    const [, type, hash] = line.slice(0, index).split(' ')
    const path = line.slice(index + 1)

    return { type, hash, path }
}

function readTjaMeta(path) {
    console.log('readTjaMeta', path)

    const tja = fs.readFileSync(path, 'utf-8')

    const title = extract(/^TITLE:(.*)$/m, tja)
    const subtitle = extract(/^SUBTITLE:--(.*)$/m, tja)

    return { title, subtitle }
}

function extract(regex, text) {
    return regex.exec(text)?.[1] || ''
}
