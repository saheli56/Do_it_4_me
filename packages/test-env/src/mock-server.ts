import fastify from "fastify";

export function createMockApp() {
  const app = fastify({ logger: false });

  app.get("/", async (req, reply) => {
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html>
        <head><title>Mock Store - Account</title></head>
        <body>
          <h1>Your Active Subscriptions</h1>
          <div class="subscription-card">
            <h3>Premium Plan ($19.99/mo)</h3>
            <p>Active since Jan 2026</p>
            <a href="/cancel-subscription" id="cancel-link" data-testid="manage-sub">Cancel Subscription</a>
          </div>
        </body>
      </html>
    `);
  });

  app.get("/cancel-subscription", async (req, reply) => {
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html>
        <head><title>Cancel Subscription</title></head>
        <body>
          <h1>Are you sure you want to cancel?</h1>
          <form action="/confirm-cancellation" method="POST">
            <label for="reason">Why are you leaving?</label>
            <select id="reason" name="reason" data-testid="cancel-reason-select">
              <option value="TOO_EXPENSIVE">Too expensive</option>
              <option value="NOT_USING">Not using it enough</option>
              <option value="OTHER">Other</option>
            </select>

            <label for="feedback">Additional Feedback</label>
            <input type="text" id="feedback" name="feedback" data-testid="feedback-input" placeholder="Tell us more..." />

            <button type="submit" id="confirm-cancel-btn" data-testid="confirm-cancel-button">Confirm Cancellation</button>
          </form>
        </body>
      </html>
    `);
  });

  app.post("/confirm-cancellation", async (req, reply) => {
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html>
        <head><title>Subscription Cancelled</title></head>
        <body>
          <div class="success-banner" data-testid="cancellation-receipt">
            <h1>Your subscription has been successfully cancelled.</h1>
            <p>You will not be billed again.</p>
          </div>
        </body>
      </html>
    `);
  });

  return app;
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const app = createMockApp();
  app.listen({ port: 4000, host: "0.0.0.0" }, (err, address) => {
    if (err) process.exit(1);
  });
}
