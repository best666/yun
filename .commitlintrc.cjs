module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((.*)\))?[：:]\s*(.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
}
