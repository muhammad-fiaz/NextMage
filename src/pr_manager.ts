import { Probot } from "probot";

export default (app: Probot, genAI: any) => {
    if (!genAI) {
        throw new Error("Next Mage is not initialized.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    async function generateCommentAndLabel(context: any, message: string, authorName?: string) {
        try {
            // Generate a message using the GoogleGenerativeAI
            const result = await model.generateContent(authorName ? `${message} and Pull Request's Author name/Username is ${authorName}` : message);
            const analysisReport = result.response.text();

            // Create a comment on the pull request
            await context.octokit.issues.createComment({
                ...context.issue(),
                issue_number: context.payload.pull_request.number,
                body: `${analysisReport}`,
            });

            // Add the "needs review" label to the pull request
            await context.octokit.issues.addLabels({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.pull_request.number,
                labels: ["needs review"],
            });

        } catch (error: any) {
            const errorMessage = `Error: ${error.message}`;
            await context.octokit.issues.createComment({
                ...context.issue(),
                issue_number: context.payload.pull_request.number,
                body: errorMessage,
            });
        }
    }

    async function getAuthorUsername(context: any) {
        return context.payload.pull_request.user.login;
    }

    async function addBadge(context: any, badge: string) {
        await context.octokit.issues.addLabels({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: context.payload.pull_request.number,
            labels: [badge],
        });
    }

    async function removeBadge(context: any, badge: string) {
        try {
            await context.octokit.issues.removeLabel({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.pull_request.number,
                name: badge,
            });
        } catch (error: any) {
            // Label does not exist, do nothing
        }
    }

    app.on("pull_request.closed", async (context) => {
        const isMerged = context.payload.pull_request.merged;
        const authorUsername = await getAuthorUsername(context);

        const message = isMerged
            ? "Pull request merged message with positive effect with happy emoji with more details and author name"
            : "Pull request closed without merge message with neutral effect tell as comment with sad emoji. tell any idea to make it useful again use can still contribute to this pull request like";

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "needs review" badge
        await removeBadge(context, "needs review");

        // Add the appropriate badge based on merge status
        if (isMerged) {
            await addBadge(context, "merged");
        } else {
            await addBadge(context, "closed");
        }
    });

    app.on("pull_request.reopened", async (context) => {
        const authorUsername = await getAuthorUsername(context);
        const message = "Pull request reopened tell as comment message with happy emoji with more details like you can improve this further";

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "closed" or "feedback pending" badge if present
        await removeBadge(context, "closed");
        await removeBadge(context, "feedback pending");

        // Add the "needs review" badge
        await addBadge(context, "needs review");
    });

    app.on("pull_request.synchronize", async (context) => {
        const diffUrl = context.payload.pull_request.diff_url;
        const responses = await fetch(diffUrl);
        const diffContent = await responses.text();

        const description = context.payload.pull_request.body || "";
        const authorUsername = await getAuthorUsername(context);
        const message = `Review the updated changes of pull request and explain the code changes from below and to finalize need owner/author/contributors/maintainers review : and this is the code changes \n\n${diffContent}\n\n this is a PR Request Author's Description:\n${description}`;

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "feedback pending" badge if present
        await removeBadge(context, "feedback pending");

        // Add the "needs review" badge
        await addBadge(context, "needs review");
    });

};
