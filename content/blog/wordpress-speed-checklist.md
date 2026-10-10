---
title: WordPress Speed Checklist
date: 2024-03-05T12:00:00Z
emoji: "🚀"
description: A checklist of best practices to speed up your WordPress website
---

<ul class="checklist">
  <li><input type="checkbox">Choose a good hosting plan</li>
  <li><input type="checkbox"><a href="https://kinsta.com/blog/php-benchmarks/">Select the latest PHP version as it is generally faster than the previous ones</a></li>
  <li><input type="checkbox">Select a lightweight theme like <a href="https://wpastra.com/">Astra</a> or <a href="https://oceanwp.org/">OceanWP</a></li>
  <li><input type="checkbox">Serve images in lightweight formats like WebP using <a href="https://wordpress.org/plugins/webp-express/">WebP Express</a></li>
  <li><input type="checkbox">Minify CSS and JS files using plugins like <a href="https://fr.wordpress.org/plugins/litespeed-cache/">LiteSpeed Cache</a> </li>
  <li><input type="checkbox">Implement caching also using <a href="https://fr.wordpress.org/plugins/litespeed-cache/">LiteSpeed Cache</a></li>
  <li><input type="checkbox">Use a Content Delivery Network for a more efficient serving of static files. Cloudflare is a good choice, but <a href="https://www.quic.cloud/">QUIC cloud</a> plays really well with LiteSpeed Cache and in my experience causes fewer problems.</li>
</ul>
