# Security policy

## Supported versions

Security fixes go into the latest minor release of the current major version.

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| < 2.0 | No |

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Report it
privately through GitHub's
[private vulnerability reporting](https://github.com/bonguynvan/bo-grid/security/advisories/new)
(the **Security** tab → **Report a vulnerability**).

Include:
- what is affected;
- how to reproduce it (a column config, data or page that shows it);
- the impact you expect.

You'll get an acknowledgement within a few days. A fix and an advisory follow
once the issue is confirmed.

## Scope notes

- Cells render values as text, and `printTable` / `toHTMLTable` escape every
  header and value. The one place HTML goes in as-is is a column `render`
  function that returns an HTML **string**, as its docs say. Sanitize
  untrusted data there, or return a DOM node instead.
- `link` cells block `javascript:` and `data:` URLs.
