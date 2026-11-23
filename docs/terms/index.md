---
title: VersaTiles - Terms of use
description: Terms of use for the public servers tiles.versatiles.org and geocode.versatiles.org.
menuEntry: Terms
---

# Terms of use for tiles.versatiles.org and geocode.versatiles.org

*Last changed: 23 November 2026*

tiles.versatiles.org and geocode.versatiles.org exist to show what
VersaTiles can do. They are run by Michael Kreil, a private person, in my
spare time. You are welcome to use them in your own projects, including
commercial ones, for free. Free to use, but not free to run: see
"Support VersaTiles" below.

## What I can't promise

- **Uptime.** The servers are run by one person in their spare time and
  paid for by donations. They can be slow or down, and I may limit or
  end the service.
- **Compatibility.** I update tilesets, styles, sprites, fonts, libraries
  and the API regularly, sometimes in ways that break existing maps,
  without announcing it in advance. If your project must not break, pin
  a frontend release or run your own server: see the guides for
  [tiles](https://docs.versatiles.org/guides/use_tiles_versatiles_org) and
  [geocoding](https://docs.versatiles.org/guides/use_geocode_versatiles_org).

The services are provided as they are. I am liable only as far as the
law requires.

## Support VersaTiles

VersaTiles is an open-source project that runs on donations, and it is
heavily underfunded. The servers, the data and the software cost money
and a lot of unpaid work.

If your company uses VersaTiles instead of a commercial map service, I
expect you to give back. My recommendation: **donate 20% of what you
save.** If commercial map hosting would cost you $1,000 a month, that is
$200 a month, and you still save $800.

Donate via [GitHub Sponsors](https://github.com/sponsors/versatiles-org)
or [Open Collective](https://opencollective.com/versatiles), or see
[versatiles.org/donate](/donate/). Open Collective issues receipts.
Sponsors from $25 a month are thanked with their name or logo on
[versatiles.org/sponsors](/sponsors/).

## Please do

- Credit the data: © OpenStreetMap contributors, plus the credits the
  tilesets overview lists for other tilesets. My styles already do this.
- Respect `429` answers and their `Retry-After` header.
- Tell me if you use the servers from an app or a server rather than
  from a website, as I can't see who you are otherwise.

## Please don't

- Put a CDN or proxy in front of the servers without asking me first.
- Download or pre-fetch tiles for large areas: use
  [download.versatiles.org](https://download.versatiles.org/).
- Geocode lists of addresses: run your own Photon server.
- Run load tests, or get around the rate limits.

I may block clients that endanger the service for others, without notice.

## Heavy use

If a commercial product or service relies on the servers with a lot of
traffic, I expect a donation, or that you run your own server. I am also
preparing a professional hosting service for companies that need more:
a reliable server, advance notice of changes and a direct contact.

I may contact the operators of websites and apps that cause a lot of
traffic.

## What I log

- **Request logs**, to find errors, misuse and attacks: time, anonymised IP
  address, path without query string, status, size, the referring website
  and the User-Agent. Of an IPv4 address I keep only the first 24 of 32
  bits, of an IPv6 address only the first 32 of 128 bits, so the logs
  name a network, not a device. The geocoder never logs the search text.
  Deleted after 4 weeks.
- **Usage statistics**, to see which websites and apps use the services and
  how much: the referring website (only its address, such as
  `https://example.com`, never the page), the requested path, size,
  status and the hour. No IP address and no User-Agent. Kept without
  time limit.

I don't set cookies and don't track visitors across requests. The
[privacy policy](/privacy/) has the details.

## Contact

Questions, CDN requests, or to tell me about your app:
[mail@versatiles.org](mailto:mail@versatiles.org).

These terms can change. The version on this page applies.

[Imprint](/imprint/) · [Privacy policy](/privacy/)
