import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/headless-vpl/docs/',
  title: 'Headless VPL',
  description: 'ビジュアルプログラミング言語を作るための次世代ライブラリ',
  lang: 'ja',

  head: [
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Headless VPL' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'ビジュアルプログラミング言語を作るための次世代ライブラリ',
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: '📖 ガイド', link: '/guide/getting-started' },
      { text: '📚 API', link: '/api/workspace' },
      { text: '🍳 レシピ', link: '/recipes/flow-editor' },
      { text: '🎮 デモ', link: '/headless-vpl/' },
      {
        text: 'v0.2.0',
        items: [
          {
            text: 'Changelog',
            link: 'https://github.com/headless-vpl/headless-vpl/blob/main/CHANGELOG.md',
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '🚀 はじめに',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'コアコンセプト', link: '/guide/core-concepts' },
            { text: 'Headless アーキテクチャ', link: '/guide/headless-architecture' },
          ],
        },
      ],
      '/api/': [
        {
          text: '⚙️ コア',
          items: [
            { text: 'Workspace', link: '/api/workspace' },
            { text: 'Container', link: '/api/container' },
            { text: 'Connector', link: '/api/connector' },
            { text: 'Edge', link: '/api/edge' },
          ],
        },
      ],
      '/recipes/': [
        {
          text: '🍳 レシピ',
          items: [
            { text: 'フロー型エディタ', link: '/recipes/flow-editor' },
            { text: 'ブロック型エディタ', link: '/recipes/block-editor' },
            { text: 'ハイブリッド型', link: '/recipes/hybrid-editor' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/headless-vpl/headless-vpl' }],

    editLink: {
      pattern: 'https://github.com/headless-vpl/headless-vpl/edit/main/docs-site/:path',
      text: 'このページを編集する',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Headless VPL',
    },

    search: {
      provider: 'local',
    },
  },
})
