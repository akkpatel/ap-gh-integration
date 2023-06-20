const { Probot, ProbotOctokit } = require('probot');

const installations = {};  // In-memory store for installations

// Create a new Probot application
const app = new Probot({
  appId: process.env.APP_ID,
  privateKey: Buffer.from(process.env.PRIVATE_KEY, 'base64').toString('utf-8'),
  Octokit: ProbotOctokit.defaults({
    retry: { enabled: false },
    throttle: { enabled: false },
  }),
});

// Handle the installation event
app.on('installation.created', async (context) => {
  console.log('we are in installion created');
  // When the GitHub App is installed, generate an installation token
  const { token } = await context.github.apps.createInstallationAccessToken({
    installation_id: context.payload.installation.id,
  });

  console.log('check the token: ', token);

  // Save the token and installation ID to the in-memory store
  installations[context.payload.installation.id] = token;
});

// Fetch repositories for a user
app.route('/').get('/api/repos/:userId', async (req, res) => {
  console.log('we are getting the use repos: ');
  const { userId } = req.params;

  try {
    // Fetch the user's GitHub details from your in-memory store (or wherever you're storing user data)
    const user = installations[userId];

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Fetch the installation from the in-memory store
    const installationToken = installations[user.installationId];

    if (!installationToken) {
      return res.status(404).send('Installation not found');
    }

    // Create a new Octokit instance with the installation token
    const octokit = new ProbotOctokit({ auth: installationToken });

    // Fetch all repositories for the authenticated user
    const { data: repos } = await octokit.repos.listForAuthenticatedUser();

    res.json(repos);
  } catch (error) {
    res.status(500).send('Error fetching repositories');
  }
});

// Start the server
app.start();