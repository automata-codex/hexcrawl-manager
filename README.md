# Beyond the Skyreach Mountains 

## Access control system overview

This project implements a hierarchical access control system to manage permissions for resources. The system uses **roles** and **scopes** to define and enforce access rules:

### Key concepts

- **Roles:** Users are assigned roles that determine their access level. Roles are hierarchical, meaning higher-level roles inherit the permissions of lower-level roles. For example:
  - **public:** Base role with access to public resources.
  - **hidden:** Inherits all public permissions and adds access to hidden resources.
  - **gm:** Inherits all hidden and public permissions and adds advanced permissions for Game Moderators.
- **Scopes:** Resources are tagged with scopes that specify the required permissions for access. Scopes are descriptive and combine the role with the action (e.g., `public:view`, `gm:write`).

### Role hierarchy

The roles and their corresponding scopes are as follows:

| Role     | Inherited Scopes                        |
|----------|-----------------------------------------|
| `public` | `public:view`                           |
| `hidden` | `public:view`, `hidden:view`            |
| `gm`     | `public:view`, `hidden:view`, `gm:view` |

### How it works

1. Role Assignment: Each user is assigned a single role (e.g., `public`, `hidden`, or `gm`).
2. Scope Resolution: A user's role dynamically resolves to all scopes available to that role and any lower roles in the hierarchy.
3. Access Validation: When a user attempts to access a resource:
    - The system compares the resource's required scope(s) with the user's resolved scopes.
    - Access is granted if there’s a match; otherwise, it’s denied.

### Examples

- A document tagged with `hidden:view`:
  - Accessible by users with the `hidden` or `gm` role.
  - Not accessible by users with the `public` role.
- A document tagged with `gm:write`:
  - Accessible only by users with the `gm` role.

### Using the access control system

- Assign users a role like `public`, `hidden`, or `gm` in the user's public metadata in the Clerk dashboard.
- Tag content with a scope such as `hidden:view` or `gm:view`. Content without an explicit scope is considered `public:view`.

### References

- [ChatGPT thread][4]

[4]: https://chatgpt.com/c/6786637a-96ec-800c-8fca-680d752b825b

## Notes

- [Usage of FontAwesome with Astro][1]
- You can search the [Open 5e API][2] with queries like `https://api.open5e.com/monsters/?search=kobold&document__slug=wotc-srd`
- I'm just using a simple claim added to the session token to verify permissions for now. This requires me to set the claim manually on every user. Clerk apparently has some very nice "organization" features (including [the `Protect` component][3]), but I can't find a nice tutorial or explanation of those features. Worth looking into if I start having to manage more than about a dozen users, or if permissions get more complicated.

[1]: https://blog.verybadfrags.com/posts/2024-02-24-astro-font-awesome/
[2]: https://open5e.com/api-docs
[3]: https://clerk.com/docs/components/protect
