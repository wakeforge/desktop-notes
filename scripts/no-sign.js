'use strict';
// 自定义签名钩子：本应用为本地分发，不做 Authenticode 签名。
// electron-builder 若使用默认签名会尝试下载 winCodeSign（含 macOS 符号链接，
// 在无符号链接权限的沙箱里解压失败）。提供此空签名函数即可绕过下载。
module.exports = async function noSign(configuration) {
  // configuration.path 为待签名文件，直接跳过
  return;
};
