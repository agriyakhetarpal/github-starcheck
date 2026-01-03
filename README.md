# GitHub Star Checker

GitHub Star Checker is an easy-to-use web tool that allows you to find out when a specific GitHub user starred a particular repository. Simply enter the GitHub username and the repository's full name (in the format `owner/repo`), and the tool will fetch and display the date and time when the user starred that repository, if applicable. The tool will also inform you if the user has not starred the repository or if either the user or repository does not exist.

> [!NOTE]
> This tool only works for public GitHub user profiles and repositories. Private profiles or users without public activity may not yield results. GHE (GitHub Enterprise) instances are not supported, so no results will be returned for such usernames or repositories.

## features

- **Shareable URLs that auto-fill the username** - would you like to share a specific user's star info? You can give them a link that auto-fills and queries automatically. [Here's an example for the user "octocat" and the repository "octocat/Spoon-Knife" repo](https://agriyakhetarpal.github.io/github-starcheck/?username=octocat&repo=octocat/Spoon-Knife)
- **Humanised times** - The tool also displays star timestamps in a human-friendly format (e.g., "2 days ago", "3 months ago")

## usage

1. Enter a GitHub username and repository full name (in the format `owner/repo`) in the input fields
2. Click "Check" or press Enter to fetch if they have starred the repository, and if yes, when

The tool displays:

- If the user has starred the repository, along with the exact date and time (in UTC) and a humanised relative time
- If the user has not starred the repository
- If either the user or repository does not exist

## why I built this

For fun! I just wanted to play around with the GitHub API endpoints. I also learned a bit about them and found an "unofficial" way to find out the total number of stars for a user (see https://stackoverflow.com/q/30636798). Also, I don't think any other tool doing exactly this exists in the wild yet!

EDIT: As I type this, I came across this blog post: https://dannguyen.github.io/til/posts/github-starred-timestamps which describes a similar tool built by Dan Nguyen to find out their star history. Check it out, too!

## privacy statement

This tool makes requests directly to GitHub's public API from your browser. No data is collected, stored, or shared with any third parties.

## contributing

Contributions of all sorts (bug reports, improvements, feedback) are welcome! Please consider opening an issue to check with me before working on something, or skip it if it's a trivial change.

To test this locally:

```console
git clone https://github.com/agriyakhetarpal/github-starcheck.git
cd github-starcheck
python -m http.server 4000
```

Then, open http://localhost:4000 in your browser.

## thanks

The design is highly inspired by [Richard Si's Next PR Number](https://github.com/ichard26/next-pr-number) and [Mariatta Wijaya's "Check Python CLA"](https://github.com/Mariatta/check_python_cla) tools. Thank you so much for sharing your work with the open source community!

### authors

- [Agriya Khetarpal](https://github.com/agriyakhetarpal)
- add your name here if you contributed!

## license

This project is licensed under the terms of [the MIT License](LICENSE). The original code was written by Richard Si, and is also licensed under the MIT License (see [LICENSE.orig](LICENSE.orig) for details).
