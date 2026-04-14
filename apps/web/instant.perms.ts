const rules = {
  attrs: {
    allow: {
      $default: "auth.id != null",
    },
  },
  namespaces: {
    // Public read: display pages render these on unauthenticated projector screens
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
    displays: {
      allow: {
        read: "true",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    // Auth required: operator-only data
    keyterms: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarSections: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarRows: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarWeeks: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarEntries: {
      allow: {
        read: "auth.id != null",
        create: "auth.id != null",
        update: "auth.id != null",
        delete: "auth.id != null",
      },
    },
    calendarSeries: {
      allow: {
        read: "auth.id != null",
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
