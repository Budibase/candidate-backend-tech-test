const fetch = require("node-fetch");

const PORT = 3000;
const HOST = `http://localhost:${PORT}`;

const VALID_EMAIL = "admin@admin.com";
const VALID_PASSWORD = "pass";

const INVALID_EMAIL = "invalid@admin.com";
const INVALID_PASSWORD = "pass1";

const CSV = `timestamp,temperature,rainfall,humidity,wind_speed,visibility
1690967790,14.1,6.11,20,23,M
1690999756,16.2,4.23,30,12,M
1691012723,15.7,3.56,20,11,G
1691032353,17.6,2.19,40,18,VG
1691054751,19.5,1.20,50,7,E`;

async function login(email, password) {
  const resp = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });
  const cookie = resp.headers.get("set-cookie");
  return { resp, cookie };
}

async function upload() {
  const { cookie } = await login(VALID_EMAIL, VALID_PASSWORD);
  return await fetch(`${HOST}/api/sensors/upload`, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
      cookie: cookie,
    },
    body: CSV,
  });
}

async function search({ filters, sort, aggregate }) {
  const { cookie } = await login(VALID_EMAIL, VALID_PASSWORD);
  const resp = await fetch(`${HOST}/api/sensors/search`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookie,
    },
    body: JSON.stringify({
      filters,
      sort,
      aggregate,
    }),
  });
  return await resp.json();
}

describe("/api/login", () => {
  it("should be able to login", async () => {
    const { resp, cookie } = await login(VALID_EMAIL, VALID_PASSWORD);
    expect(resp.status).toEqual(200);
    expect(cookie).not.toBeFalsy();
  });

  it("should not be able to login with invalid credentials", async () => {
    const { resp, cookie } = await login(INVALID_EMAIL, INVALID_PASSWORD);
    expect(resp.status).toEqual(403);
    expect(cookie).toBeFalsy();
  });
});

describe("/api/sensors/upload", () => {
  it("should be able to upload data", async () => {
    const resp = await upload();
    expect(resp.status).toBe(200);
  });
});

describe("/api/sensors/search", () => {
  it("should be able to filter some data", async () => {
    const results = await search({
      filters: {
        humidity: { gte: 30 },
      },
    });
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("should be able to check equality", async () => {
    const results = await search({
      filters: {
        humidity: { eq: 30 },
        rainfall: { eq: 4.23 },
      },
    });
    expect(results.length).toBe(1);
    expect(results[0].temperature).toBe(16.2);
  });

  it("should be able to aggregate some results", async () => {
    const results = await search({
      aggregate: {
        column: "humidity",
        operator: "SUM",
      },
    });
    expect(results.length).toBe(1);
    expect(results[0].humidity).toBeGreaterThanOrEqual(160);
  });

  it("should be able to sort", async () => {
    const results = await search({
      sort: {
        column: "temperature",
        order: "ascending",
      },
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].temperature).toBeLessThanOrEqual(results[1].temperature);
  });
});
