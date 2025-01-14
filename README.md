# hex-world 

## Notes

- [Usage of FontAwesome with Astro][1]
- You can search the [Open 5e API][2] with queries like `https://api.open5e.com/monsters/?search=kobold&document__slug=wotc-srd`
- I'm just using a simple claim added to the session token to verify permissions for now. This requires me to set the claim manually on every user. Clerk apparently has some very nice "organization" features (including [the `Protect` component][3]), but I can't find a nice tutorial or explanation of those features. Worth looking into if I start having to manage more than about a dozen users, or if permissions get more complicated.

[1]: https://blog.verybadfrags.com/posts/2024-02-24-astro-font-awesome/
[2]: https://open5e.com/api-docs
[3]: https://clerk.com/docs/components/protect
