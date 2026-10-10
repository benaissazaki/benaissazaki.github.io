---
title: WordPress Security Checklist
date: 2024-01-14T12:00:00Z
emoji: "☑️"
description: A checklist of best practices to secure your WordPress website
---

## Hosting
<ul class="checklist">
  <li><input type="checkbox">Choose a reputable hosting provider</li>
  <li><input type="checkbox">Pick a strong password for your hosting account and enable 2FA if possible</li>
</ul>

## Control panel
<ul class="checklist">
  <li><input type="checkbox">Pick a strong password for your control panel account and enable 2FA if possible
  </li>
  <li><input type="checkbox">Enable an anti-virus software if there is one
    <a href="https://docs.cpanel.net/whm/plugins/configure-clamav-scanner/">
      (cPanel has ClamAV scanner which can
      be enabled via WHM)
    </a>
  </li>
</ul>

## WordPress

### General
<ul class="checklist">
  <li><input type="checkbox"> Enforce HTTPS</li>
  <li><input type="checkbox"> Install a security plugin (Wordfence is the most popular free option)</li>
  <li><input type="checkbox"> Schedule regular backups of your website (you can use UpdraftPlus)</li>
</ul>

### Authentication
<ul class="checklist">
  <li><input type="checkbox"> Pick a strong password for the admin account</li>
  <li><input type="checkbox"> Delete unused accounts</li>
  <li><input type="checkbox">
    <a href="https://www.wpbeginner.com/plugins/how-to-force-strong-password-on-users-in-wordpress/">
      Enforce strong passwords for users
    </a>
  </li>
  <li><input type="checkbox"> Disable registration if you don't need it (Settings > General > Uncheck 'Anyone
    can
    register')</li>
  <li><input type="checkbox">
    <a href="https://blogvault.net/wordpress-disable-xmlrpc/">
      Disable XML-RPC if you don't need it
    </a>
    (you most likely don't)
  </li>
  <li><input type="checkbox"> Regularly change passwords</li>
  <li><input type="checkbox"> Activate 2FA for admin accounts (can be done with Wordfence)</li>
  <li><input type="checkbox"> Add a captcha to the admin login page (can be done with Wordfence)</li>
  <li><input type="checkbox"> Hide the login page (you can use WPS Hide Login)</li>
</ul>

### Themes and plugins
<ul class="checklist">
  <li><input type="checkbox"> Don't overload your website with too many plugins/themes</li>
  <li><input type="checkbox"> Don't use plugins/themes that are not regularly updated</li>
  <li><input type="checkbox"> NEVER use cracked/nulled plugins/themes</li>
  <li><input type="checkbox"> Keep your plugins/themes up to date</li>
</ul>
