const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");

async function getParametersByPath(path, region) {
  const client = new SSMClient({ region });
  const parameters = {};

  let nextToken;
  do {
    const command = new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken
    });

    const response = await client.send(command);

    for (const param of response.Parameters || []) {
      if (param.Name && param.Value) {
        const key = (param.Name.split("/").pop() || "").toUpperCase();
        parameters[key] = param.Value;
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return parameters;
}

module.exports = async ({ resolveVariable }) => {
  const stage = await resolveVariable("sls:stage");
  const region = await resolveVariable("self:provider.region");
  const paths = [`/<service>/${stage}`, `/<some-other-prefix-if-needed>/${stage}`];

  const allParameters = {
    NODE_ENV: "production"
  };

  for (const path of paths) {
    const parameters = await getParametersByPath(path, region);
    Object.assign(allParameters, parameters);
  }

  return allParameters;
};
