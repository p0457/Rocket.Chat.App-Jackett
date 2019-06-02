export default {
  setserver: {
    command: 'jacket-set-server',
    usage: '`/jackett-set-server [SERVER ADDRESS]`',
    description: 'Set the Jackett Server Address',
  },
  login: {
    command: 'jackett-login',
    usage: '`/jackett-login [PASSWORD]`',
    description: 'Login to you Jackett Server',
  },
  indexers: {
    command: 'jackett-indexers',
    usage: '`/jackett-indexers [configured|unconfigured|public|private]`',
    description: 'Show all indexers, optionally filter by configured/public',
  },
  search: {
    command: 'jackett-search',
    usage: '`/jackett-search (p=2) (filter=(word1 word2 seeders>2)) (trackers=(tracker1,tracker2) [QUERY]`',
    // tslint:disable-next-line:max-line-length
    description: 'Search Jackett and returns results (start query with p=?? to paginate, trackers=(??,??) to optionally specify trackers, or filter=(?? ??) to optionally filter the results)',
  },
  apike: {
    command: 'jackett-set-apikey',
    usage: '`/jackett-set-apikey [API KEY]`',
    description: 'Set the Jackett API Key',
  },
};
