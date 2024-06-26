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

            // Add the "needs review" label to the pull request if it doesn't already exist
            await addLabelIfNotExists(context, "needs review");

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

    async function addLabelIfNotExists(context: any, label: string) {
        const labels = await context.octokit.issues.listLabelsOnIssue({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: context.payload.pull_request.number,
        });

        if (!labels.data.some((l: any) => l.name === label)) {
            await context.octokit.issues.addLabels({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.pull_request.number,
                labels: [label],
            });
        }
    }

    async function removeLabelIfExists(context: any, label: string) {
        const labels = await context.octokit.issues.listLabelsOnIssue({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: context.payload.pull_request.number,
        });

        if (labels.data.some((l: any) => l.name === label)) {
            await context.octokit.issues.removeLabel({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.pull_request.number,
                name: label,
            });
        }
    }

    app.on("pull_request.closed", async (context) => {
        const isMerged = context.payload.pull_request.merged;
        const authorUsername = await getAuthorUsername(context);

        const message = isMerged
            ? "Pull request merged message with positive effect with happy emoji with more details and author name"
            : "Pull request closed without merge message with neutral effect tell as comment with sad emoji. tell any idea to make it useful again use can still contribute to this pull request like";

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "needs review" label
        await removeLabelIfExists(context, "needs review");

        // Add the appropriate label based on merge status
        if (isMerged) {
            await addLabelIfNotExists(context, "merged");
        } else {
            await addLabelIfNotExists(context, "closed");
        }
    });

    app.on("pull_request.reopened", async (context) => {
        const authorUsername = await getAuthorUsername(context);
        const message = "Pull request reopened tell as comment message with happy emoji with more details like you can improve this further";

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "closed" or "feedback pending" label if present
        await removeLabelIfExists(context, "closed");
        await removeLabelIfExists(context, "feedback pending");

        // Add the "needs review" label
        await addLabelIfNotExists(context, "needs review");
    });

    app.on("pull_request.synchronize", async (context) => {
        const diffUrl = context.payload.pull_request.diff_url;
        const responses = await fetch(diffUrl);
        const diffContent = await responses.text();

        const description = context.payload.pull_request.body || "";
        const authorUsername = await getAuthorUsername(context);
        const message = `Review the updated changes of pull request detailed with changed as code reference and explain the code changes from below and to finalize need owner/author/contributors/maintainers review : and this is the code changes \n\n${diffContent}\n\n this is a PR Request Author's Description:\n${description}`;

        await generateCommentAndLabel(context, message, authorUsername);

        // Remove the "feedback pending" label if present
        await removeLabelIfExists(context, "feedback pending");

        // Add the "needs review" label
        await addLabelIfNotExists(context, "needs review");
    });

};
