# Beyond the Skyreach Mountains 

## Access control system overview

This project implements an access control system to manage permissions for resources. The system uses **roles** and **scopes** to define and enforce access rules:

### Key Concepts

**Scopes** are attached to content and determine what can be done with that content. **Roles** are assigned to users. Permission checks verify that the current user's role has access to the scope of the content they are trying to access.

### How It Works

This check can be performed programmatically, or a convenience wrapper can be used to simplify the check process. Content without a check is accessible by all users.

- `PublicContent` is limited to unregistered users, users without a role, and users with the `public` role.
- `PlayerContent` is limited to users with the `player` role.
- `SecretContent` is limited to users with the `gm` role.
- `OpenContent` is accessible by public users and users with the `player` role.
- `HiddenContent` is accessible by users with the `player` role or the `gm` role.

The `role` has to be set manually on the user's "public metadata" in the Clerk dashboard. The `role` is a string that can be `public`, `player`, or `gm`.

### Best Practices

- Pages that contain only GM content should return a `404` status code if access by unauthorized users. The `SecretLayout` layout component provides this functionality out of the box.

### References

- [ChatGPT thread][4]

[4]: https://chatgpt.com/c/6786637a-96ec-800c-8fca-680d752b825b

## Notes

- [Usage of FontAwesome with Astro][1]
- You can search the [Open 5e API][2] with queries like `https://api.open5e.com/monsters/?search=kobold&document__slug=wotc-srd`

[1]: https://blog.verybadfrags.com/posts/2024-02-24-astro-font-awesome/
[2]: https://open5e.com/api-docs
