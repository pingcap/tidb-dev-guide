# TiDB Development Guide

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-39-orange.svg?style=flat-square)](#contributors-)
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

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/LittleFall"><img src="https://avatars.githubusercontent.com/u/30543181?v=4?s=100" width="100px;" alt="Zhi Qi"/><br /><sub><b>Zhi Qi</b></sub></a><br /><a href="#content-LittleFall" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://tisonkun.github.io/Miracle/"><img src="https://avatars.githubusercontent.com/u/18818196?v=4?s=100" width="100px;" alt="tison"/><br /><sub><b>tison</b></sub></a><br /><a href="#content-tisonkun" title="Content">🖋</a> <a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Atisonkun" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="http://zz-jason.github.io/"><img src="https://avatars.githubusercontent.com/u/5268763?v=4?s=100" width="100px;" alt="Jian Zhang"/><br /><sub><b>Jian Zhang</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Azz-jason" title="Reviewed Pull Requests">👀</a> <a href="#content-zz-jason" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/qiancai"><img src="https://avatars.githubusercontent.com/u/79440533?v=4?s=100" width="100px;" alt="Grace Cai"/><br /><sub><b>Grace Cai</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Aqiancai" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://ichn.xyz"><img src="https://avatars.githubusercontent.com/u/29735669?v=4?s=100" width="100px;" alt="虎"/><br /><sub><b>虎</b></sub></a><br /><a href="#content-ichn-hu" title="Content">🖋</a> <a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Aichn-hu" title="Reviewed Pull Requests">👀</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/bb7133"><img src="https://avatars.githubusercontent.com/u/1174042?v=4?s=100" width="100px;" alt="bb7133"/><br /><sub><b>bb7133</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Abb7133" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://www.linkedin.com/in/gregabramowitzweber"><img src="https://avatars.githubusercontent.com/u/1183?v=4?s=100" width="100px;" alt="Greg Weber"/><br /><sub><b>Greg Weber</b></sub></a><br /><a href="#content-gregwebs" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/djshow832"><img src="https://avatars.githubusercontent.com/u/29590578?v=4?s=100" width="100px;" alt="djshow832"/><br /><sub><b>djshow832</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Adjshow832" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="http://www.zenlife.tk"><img src="https://avatars.githubusercontent.com/u/1420062?v=4?s=100" width="100px;" alt="tiancaiamao"/><br /><sub><b>tiancaiamao</b></sub></a><br /><a href="#content-tiancaiamao" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/tomdewan"><img src="https://avatars.githubusercontent.com/u/50153616?v=4?s=100" width="100px;" alt="tomdewan"/><br /><sub><b>tomdewan</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Atomdewan" title="Reviewed Pull Requests">👀</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/disksing"><img src="https://avatars.githubusercontent.com/u/12077877?v=4?s=100" width="100px;" alt="disksing"/><br /><sub><b>disksing</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Adisksing" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://www.hawkingrei.com/blog/"><img src="https://avatars.githubusercontent.com/u/3427324?v=4?s=100" width="100px;" alt="Weizhen Wang"/><br /><sub><b>Weizhen Wang</b></sub></a><br /><a href="#content-hawkingrei" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/TomShawn"><img src="https://avatars.githubusercontent.com/u/41534398?v=4?s=100" width="100px;" alt="TomShawn"/><br /><sub><b>TomShawn</b></sub></a><br /><a href="#content-TomShawn" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/mjonss"><img src="https://avatars.githubusercontent.com/u/5520054?v=4?s=100" width="100px;" alt="Mattias Jonsson"/><br /><sub><b>Mattias Jonsson</b></sub></a><br /><a href="#content-mjonss" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="http://www.tocker.ca/"><img src="https://avatars.githubusercontent.com/u/57982?v=4?s=100" width="100px;" alt="Morgan Tocker"/><br /><sub><b>Morgan Tocker</b></sub></a><br /><a href="#content-morgo" title="Content">🖋</a> <a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Amorgo" title="Reviewed Pull Requests">👀</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="http://databaseblog.myname.nl"><img src="https://avatars.githubusercontent.com/u/1272980?v=4?s=100" width="100px;" alt="Daniël van Eeden"/><br /><sub><b>Daniël van Eeden</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Adveeden" title="Reviewed Pull Requests">👀</a> <a href="#content-dveeden" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://xxchan.github.io"><img src="https://avatars.githubusercontent.com/u/37948597?v=4?s=100" width="100px;" alt="xxchan"/><br /><sub><b>xxchan</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Axxchan" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://www.iamhlbx.xyz"><img src="https://avatars.githubusercontent.com/u/50866227?v=4?s=100" width="100px;" alt="iamhlbx"/><br /><sub><b>iamhlbx</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3AHuGanghui" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/sunxiaoguang"><img src="https://avatars.githubusercontent.com/u/3982329?v=4?s=100" width="100px;" alt="Xiaoguang Sun"/><br /><sub><b>Xiaoguang Sun</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Asunxiaoguang" title="Reviewed Pull Requests">👀</a> <a href="#content-sunxiaoguang" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/eurekaka"><img src="https://avatars.githubusercontent.com/u/6261973?v=4?s=100" width="100px;" alt="Kenan Yao"/><br /><sub><b>Kenan Yao</b></sub></a><br /><a href="#content-eurekaka" title="Content">🖋</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://about.me/li.su"><img src="https://avatars.githubusercontent.com/u/528332?v=4?s=100" width="100px;" alt="lysu"/><br /><sub><b>lysu</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Alysu" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/cfzjywxk"><img src="https://avatars.githubusercontent.com/u/3692139?v=4?s=100" width="100px;" alt="cfzjywxk"/><br /><sub><b>cfzjywxk</b></sub></a><br /><a href="#content-cfzjywxk" title="Content">🖋</a> <a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Acfzjywxk" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://blog.tongmu.me"><img src="https://avatars.githubusercontent.com/u/9587680?v=4?s=100" width="100px;" alt="you06"/><br /><sub><b>you06</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Ayou06" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/ekexium"><img src="https://avatars.githubusercontent.com/u/31720476?v=4?s=100" width="100px;" alt="Ziqian Qin"/><br /><sub><b>Ziqian Qin</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Aekexium" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/zhangyangyu"><img src="https://avatars.githubusercontent.com/u/3690895?v=4?s=100" width="100px;" alt="Xiang Zhang"/><br /><sub><b>Xiang Zhang</b></sub></a><br /><a href="#content-zhangyangyu" title="Content">🖋</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/XuHuaiyu"><img src="https://avatars.githubusercontent.com/u/9039012?v=4?s=100" width="100px;" alt="HuaiyuXu"/><br /><sub><b>HuaiyuXu</b></sub></a><br /><a href="#content-XuHuaiyu" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://sticnarf.me"><img src="https://avatars.githubusercontent.com/u/17217495?v=4?s=100" width="100px;" alt="Yilin Chen"/><br /><sub><b>Yilin Chen</b></sub></a><br /><a href="#content-sticnarf" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/tangenta"><img src="https://avatars.githubusercontent.com/u/24713065?v=4?s=100" width="100px;" alt="tangenta"/><br /><sub><b>tangenta</b></sub></a><br /><a href="#content-tangenta" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/wshwsh12"><img src="https://avatars.githubusercontent.com/u/14054293?v=4?s=100" width="100px;" alt="Shenghui Wu"/><br /><sub><b>Shenghui Wu</b></sub></a><br /><a href="#content-wshwsh12" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/winoros"><img src="https://avatars.githubusercontent.com/u/7846227?v=4?s=100" width="100px;" alt="Yiding Cui"/><br /><sub><b>Yiding Cui</b></sub></a><br /><a href="#content-winoros" title="Content">🖋</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/MyonKeminta"><img src="https://avatars.githubusercontent.com/u/9948422?v=4?s=100" width="100px;" alt="MyonKeminta"/><br /><sub><b>MyonKeminta</b></sub></a><br /><a href="#content-MyonKeminta" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/mengxin9014"><img src="https://avatars.githubusercontent.com/u/22741979?v=4?s=100" width="100px;" alt="Meng Xin"/><br /><sub><b>Meng Xin</b></sub></a><br /><a href="#content-mengxin9014" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/Mini256"><img src="https://avatars.githubusercontent.com/u/5086433?v=4?s=100" width="100px;" alt="Mini256"/><br /><sub><b>Mini256</b></sub></a><br /><a href="#content-Mini256" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/qw4990"><img src="https://avatars.githubusercontent.com/u/7499936?v=4?s=100" width="100px;" alt="Yuanjia Zhang"/><br /><sub><b>Yuanjia Zhang</b></sub></a><br /><a href="#content-qw4990" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/yahonda"><img src="https://avatars.githubusercontent.com/u/73684?v=4?s=100" width="100px;" alt="Yasuo Honda"/><br /><sub><b>Yasuo Honda</b></sub></a><br /><a href="#content-yahonda" title="Content">🖋</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="20%"><a href="https://github.com/windtalker"><img src="https://avatars.githubusercontent.com/u/1916264?v=4?s=100" width="100px;" alt="xufei"/><br /><sub><b>xufei</b></sub></a><br /><a href="#content-windtalker" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/zanmato1984"><img src="https://avatars.githubusercontent.com/u/1061004?v=4?s=100" width="100px;" alt="ruoxi"/><br /><sub><b>ruoxi</b></sub></a><br /><a href="https://github.com/pingcap/tidb-dev-guide/pulls?q=is%3Apr+reviewed-by%3Azanmato1984" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="20%"><a href="https://www.highpon.com/"><img src="https://avatars.githubusercontent.com/u/54130718?v=4?s=100" width="100px;" alt="s-shiraki"/><br /><sub><b>s-shiraki</b></sub></a><br /><a href="#content-highpon" title="Content">🖋</a></td>
      <td align="center" valign="top" width="20%"><a href="https://github.com/YukihiroArakawa"><img src="https://avatars.githubusercontent.com/u/54029373?v=4?s=100" width="100px;" alt="YukihiroArakawa"/><br /><sub><b>YukihiroArakawa</b></sub></a><br /><a href="#content-YukihiroArakawa" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
