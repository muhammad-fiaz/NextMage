import { Probot } from "probot";

export default (app: Probot, genAI: any) => {
    app.on("issues.closed", async (context) => {
        try {
            if (!genAI) {
                throw new Error("Next Mage is not initialized.");
            }

            // Generate a message for the closed issue using the GoogleGenerativeAI
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Issue closed message with cheerful effect");
            const response = result.response;
            const analysisReport = response.text();

            const closedComment = context.issue({
                body: `${analysisReport}`,
            });

            await context.octokit.issues.createComment(closedComment);

            // Remove the "solved" label if present
            const labels = await context.octokit.issues.listLabelsOnIssue({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.issue.number,
            });

            const hasSolvedLabel = labels.data.some((label) => label.name === "solved");

            if (hasSolvedLabel) {
                await context.octokit.issues.removeLabel({
                    owner: context.payload.repository.owner.login,
                    repo: context.payload.repository.name,
                    issue_number: context.payload.issue.number,
                    name: "solved",
                });
            }

            // Remove the "review requested" label if present
            const hasReviewRequestedLabel = labels.data.some((label) => label.name === "review requested");

            if (hasReviewRequestedLabel) {
                await context.octokit.issues.removeLabel({
                    owner: context.payload.repository.owner.login,
                    repo: context.payload.repository.name,
                    issue_number: context.payload.issue.number,
                    name: "review requested",
                });
            }

            // Remove the "feedback pending" label if present
            const hasFeedbackPendingLabel = labels.data.some((label) => label.name === "feedback pending");

            if (hasFeedbackPendingLabel) {
                await context.octokit.issues.removeLabel({
                    owner: context.payload.repository.owner.login,
                    repo: context.payload.repository.name,
                    issue_number: context.payload.issue.number,
                    name: "feedback pending",
                });
            }

        } catch (error: any) {
            const commentError = context.issue({
                body: `Error: ${error.message}`,
            });
            await context.octokit.issues.createComment(commentError);
        }
    });

    app.on("issues.reopened", async (context) => {
        try {
            if (!genAI) {
                throw new Error("Next Mage is not initialized.");
            }

            // Generate a message for the reopened issue using the GoogleGenerativeAI
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("this issue has been reopened! with sad emoji");
            const response = result.response;
            const analysisReport = response.text();

            const reopenedComment = context.issue({
                body: `${analysisReport}`,
            });

            await context.octokit.issues.createComment(reopenedComment);

            // Remove the "solved" label if present
            const labels = await context.octokit.issues.listLabelsOnIssue({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.issue.number,
            });

            const hasSolvedLabel = labels.data.some((label) => label.name === "solved");

            if (hasSolvedLabel) {
                await context.octokit.issues.removeLabel({
                    owner: context.payload.repository.owner.login,
                    repo: context.payload.repository.name,
                    issue_number: context.payload.issue.number,
                    name: "solved",
                });
            }

            // Add the "review requested" and "feedback pending" labels
            await context.octokit.issues.addLabels({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.issue.number,
                labels: ["review requested", "feedback pending"],
            });
        } catch (error: any) {
            const commentError = context.issue({
                body: `Error: ${error.message}`,
            });
            await context.octokit.issues.createComment(commentError);
        }
    });

    app.on("issues.opened", async (context) => {
        try {
            if (!genAI) {
                throw new Error("Next Mage is not initialized.");
            }

            // Create a thank you comment for reporting the issue
            const thankYouComment = context.issue({
                body: "Thank you for reporting this issue! Our team will look into it.",
            });

            await context.octokit.issues.createComment(thankYouComment);

            // Generate a message for the issue using the GoogleGenerativeAI
            const issueBody = context.payload.issue.body ?? '';
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(issueBody);
            const response = result.response;
            const analysisReport = response.text();

            // Determine the label based on the analysis report
            let labelToAdd = "";
            if (analysisReport.includes("bug")) {
                labelToAdd = "bug";
            } else if (analysisReport.includes("feature request")) {
                labelToAdd = "feature request";
            } else {
                labelToAdd = "needs-triage";
            }

            // Add the appropriate label to the issue
            await context.octokit.issues.addLabels({
                owner: context.payload.repository.owner.login,
                repo: context.payload.repository.name,
                issue_number: context.payload.issue.number,
                labels: [labelToAdd],
            });

            // Create a comment on the issue with the Gemini report
            const reportComment = context.issue({
                body: `Based on the issue description, here's a possible solution: \n\n${analysisReport}`,
            });

            await context.octokit.issues.createComment(reportComment);
        } catch (error: any) {
            const commentError = context.issue({
                body: `Error: ${error.message}`,
            });
            await context.octokit.issues.createComment(commentError);
        }
    });
};
