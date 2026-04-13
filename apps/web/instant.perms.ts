const rules = {
  attrs: {
    allow: {
      $default: "true",
    },
  },
  namespaces: {
    sessions: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    transcriptEvents: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "false",
        delete: "auth.id != null",
      },
    },
    keyterms: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
  },
};

export default rules;
