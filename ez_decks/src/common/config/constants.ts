const nodeEnvValues = ['development', 'test', 'production'] as const;
type node_env_choices = (typeof nodeEnvValues)[number];

export const isValidNodeEnv = (env: any): env is node_env_choices => {
   return nodeEnvValues.includes(env);
};

export const node_env: node_env_choices = isValidNodeEnv(process.env.NODE_ENV)
   ? (process.env.NODE_ENV as node_env_choices)
   : 'development';
