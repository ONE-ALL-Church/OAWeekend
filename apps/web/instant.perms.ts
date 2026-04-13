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
    displays: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "true",
        delete: "auth.id != null",
      },
    },
    calendarSections: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarRows: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarWeeks: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarEntries: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarSeries: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarRoles: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
  },
};

export default rules;
