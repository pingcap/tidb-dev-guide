# TiDB Development Guide

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-13-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## About this guide

* **The target audience** of this guide is TiDB contributors, both new and experienced.

* **The objective** of this guide is to help contributors become an expert of TiDB, who is familiar with its design and implementation and thus is able to use it fluently in the real world as well as develop TiDB itself deeply.

## The structure of this guide

At present, the guide is composed of the following parts:

1. **Get started:** Setting up the development environment, build and connect to the tidb-server, the subsections are based on an imagined newbie user journey.
2. **Contribute to TiDB** helps you quickly get involved in the TiDB community, which illustrates what contributions you can make and how to quickly make one.
3. **Understand TiDB**: helps you to be familiar with basic distributed database concepts, build a knowledge base in your mind, including but not limited to SQL language, key components, algorithms in a distributed database. The audiences who are already familiar with these concepts can skip this section.
4. **Project Management**: helps you to participate in team working, lead feature development, manage projects in the TiDB community.

## Contribute to this guide

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/LittleFall"><img src="https://avatars.githubusercontent.com/u/30543181?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Zhi Qi</b></sub></a><br /><a href="#content-LittleFall" title="Content">🖋</a></td>
    <td align="center"><a href="https://tisonkun.github.io/Miracle/"><img src="https://avatars.githubusercontent.com/u/18818196?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tison</b></sub></a><br /><a href="#content-tisonkun" title="Content">🖋</a> <a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Atisonkun" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="http://zz-jason.github.io/"><img src="https://avatars.githubusercontent.com/u/5268763?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jian Zhang</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Azz-jason" title="Reviewed Pull Requests">👀</a> <a href="#content-zz-jason" title="Content">🖋</a></td>
    <td align="center"><a href="https://github.com/qiancai"><img src="https://avatars.githubusercontent.com/u/79440533?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Grace Cai</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Aqiancai" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://ichn.xyz"><img src="https://avatars.githubusercontent.com/u/29735669?v=4?s=100" width="100px;" alt=""/><br /><sub><b>虎</b></sub></a><br /><a href="#content-ichn-hu" title="Content">🖋</a> <a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Aichn-hu" title="Reviewed Pull Requests">👀</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/bb7133"><img src="https://avatars.githubusercontent.com/u/1174042?v=4?s=100" width="100px;" alt=""/><br /><sub><b>bb7133</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Abb7133" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/gregabramowitzweber"><img src="https://avatars.githubusercontent.com/u/1183?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Greg Weber</b></sub></a><br /><a href="#content-gregwebs" title="Content">🖋</a></td>
    <td align="center"><a href="https://github.com/djshow832"><img src="https://avatars.githubusercontent.com/u/29590578?v=4?s=100" width="100px;" alt=""/><br /><sub><b>djshow832</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Adjshow832" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="http://www.zenlife.tk"><img src="https://avatars.githubusercontent.com/u/1420062?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tiancaiamao</b></sub></a><br /><a href="#content-tiancaiamao" title="Content">🖋</a></td>
    <td align="center"><a href="https://github.com/tomdewan"><img src="https://avatars.githubusercontent.com/u/50153616?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tomdewan</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Atomdewan" title="Reviewed Pull Requests">👀</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/disksing"><img src="https://avatars.githubusercontent.com/u/12077877?v=4?s=100" width="100px;" alt=""/><br /><sub><b>disksing</b></sub></a><br /><a href="https://github.com/zz-jason/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Adisksing" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://www.hawkingrei.com/blog/"><img src="https://avatars.githubusercontent.com/u/3427324?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Weizhen Wang</b></sub></a><br /><a href="#content-hawkingrei" title="Content">🖋</a></td>
    <td align="center"><a href="https://github.com/TomShawn"><img src="https://avatars.githubusercontent.com/u/41534398?v=4?s=100" width="100px;" alt=""/><br /><sub><b>TomShawn</b></sub></a><br /><a href="#content-TomShawn" title="Content">🖋</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
