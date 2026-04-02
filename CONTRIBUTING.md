# Contributing

Contributions of all kinds are welcome here, and they are greatly appreciated!
Every little bit helps, and credit will always be given.

## Example Contributions

You can contribute in many ways, for example:

* [Report bugs](#report-bugs)
* [Fix Bugs](#fix-bugs)
* [Implement Features](#implement-features)
* [Write Documentation](#write-documentation)
* [Submit Feedback](#submit-feedback)

### Report Bugs

Report bugs at <https://github.com/jiroamato/bidly/issues>.

**If you are reporting a bug, please follow the template guidelines. The more
detailed your report, the easier and thus faster we can help you.**

### Fix Bugs

Look through the GitHub issues for bugs. Anything labelled with `bug` and `help wanted` is open to whoever wants to implement it. When you decide to work on such an issue, please assign yourself to it and add a comment that you'll be working on that, too. If you see another issue without the `help wanted` label, just post a comment, the maintainers are usually happy for any support that they can get.

### Implement Features

Look through the GitHub issues for features. Anything labelled with
`enhancement` and `help wanted` is open to whoever wants to implement it. As
for [fixing bugs](#fix-bugs), please assign yourself to the issue and add a comment that you'll be working on that, too. If another enhancement catches your fancy, but it doesn't have the `help wanted` label, just post a comment, the maintainers are usually happy for any support that they can get.

### Write Documentation

fin-health could always use more documentation, whether as
part of the official documentation, in docstrings, or even on the web in blog
posts, articles, and such. Just
[open an issue](https://github.com/jiroamato/bidly/issues)
to let us know what you will be working on so that we can provide you with guidance.

### Submit Feedback

The best way to send feedback is to file an issue at
<https://github.com/jiroamato/bidly/issues> using the Peer Review template. If your feedback fits the format of the Peer Review template, please use that. Remember that this is a volunteer-driven project and everybody has limited time.

## Git Workflow

We use a branching workflow based on GitHub Flow. Here's how it works:

### Branch Structure

```
main
 └── dev
      ├── feature/feature-name
      │    └── test/feature-name
      └── fix/bug-name
```

### Workflow Steps

1. **`main` branch**: The stable, production-ready branch. Only receives merges from `dev` after milestone completion.

2. **`dev` branch**: The integration branch where all features and fixes are merged. Branched from `main`.

3. **Feature branches**: For new features, branch from `dev`:

   ```bash
   git switch develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   git push origin feature/your-feature-name
   ```

4. **Fix branches**: For bug fixes, branch from `dev`:

   ```bash
   git switch develop
   git pull origin develop
   git checkout -b fix/bug-name
   git push origin fix/bug-name
   ```

5. **Test branches**: For writing tests, branch from your feature branch:

   ```bash
   git switch feature/your-feature-name
   git checkout -b test/your-feature-name
   git push origin test/your-feature-name
   ```

   When tests are complete, create a PR from `test/your-feature-name` → `feature/your-feature-name`.

6. **Merging back**: Once your feature is complete (code + tests), create a PR from `feature/your-feature-name` → `dev`.

### Pull Request Process

1. Ensure all tests pass locally before creating a PR
2. Request review from at least one team member
3. Address all review comments before merging
4. After approval, merge and delete the feature branch

## Developer Setup

### Prerequisite

- Node.js 18+
- A Supabase project
- API keys: [Anthropic](https://console.anthropic.com/)
Ready to contribute? Here's how to set up bidly for
local development.

1. Clone your fork locally (*if you want to work locally*)

    ```shell
    git clone git@github.com:your_name_here/bidly.git
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Set up environment variables as a prerequisite.

> Create a `.env.local` file:

    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ANTHROPIC_API_KEY=your_anthropic_key
    API_SECRET_KEY=your_api_secret              # optional — API key gate for production
    NEXT_PUBLIC_API_KEY=your_api_key            # optional — must match API_SECRET_KEY
    ```

4. Download tender data

> Download the CSV from [Open Canada — Open tenders notices](https://open.canada.ca/data/en/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2) (under **"Open tenders notices"**) and save it to the project root as:

    ```
    openTenderNotice-ouvertAvisAppelOffres.csv
    ```

5. Set up the database by running the schema migration in your Supabase SQL Editor:

    ```
    supabase/migrations/001_schema.sql
    ```

6. Seed tender data

    ```bash
    npx tsx scripts/seed-tenders.ts
    ```

7. Run the dev server

    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to start using Bidly.

8. Run the test suite

    ```bash
    npm run test
    ```

9. Create a branch for local development using the default branch (typically `dev`) as a starting point. Use `fix` or `feature` as a prefix for your branch name.

    ```shell
    git checkout develop
    git checkout -b fix-name-of-your-bugfix
    ```

    Now you can make your changes locally.

10. Check that your changes pass our test suite.

    ```bash
    npm run test
    ```

11. Commit your changes and push your branch to GitHub. Please use [semantic
   commit messages](https://www.conventionalcommits.org/).

    ```shell
    git add .
    git commit -m "fix: summarize your changes"
    git push -u origin fix-name-of-your-bugfix
    ```

12. Open the link displayed in the message when pushing your new branch in order to submit a pull request.

### Pull Request Guidelines

Before you submit a pull request, check that it meets these guidelines:

1. The pull request should include tests.
2. If the pull request adds functionality, the docs should be updated. Put your new functionality into a function with a docstring.
3. Your pull request will automatically be checked by the full test suite. It needs to pass all of them before it can be considered for merging.