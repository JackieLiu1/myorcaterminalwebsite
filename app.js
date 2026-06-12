const DOWNLOAD_DIRECTORY = "./downloads";
const DOWNLOAD_MANIFEST_URL = `${DOWNLOAD_DIRECTORY}/manifest.json`;

const SITE_INFO = {
  owner: "OrcaTerminal",
  contactEmail: "liu.yun@linux.dev",
  icpNumber: "湘ICP备18007730号-1",
  policeRecord: "",
  policeRecordUrl: "",
};

const PACKAGE_FORMAT_LABELS = {
  appimage: "AppImage",
  deb: "DEB",
  dmg: "DMG",
  exe: "EXE",
  msi: "MSI",
  pkg: "PKG",
  rpm: "RPM",
  "tar.gz": "TAR.GZ",
  tgz: "TGZ",
  zip: "ZIP",
};

const PACKAGE_FORMAT_NOTES = {
  appimage: "适用于主流 Linux 桌面发行版",
  deb: "适用于 KylinOS / Debian / Ubuntu 系发行版",
  rpm: "适用于 openEuler / Fedora / RHEL / openSUSE 系发行版",
};

const PACKAGE_FORMAT_ORDER = new Map([
  ["dmg", 0],
  ["exe", 0],
  ["deb", 0],
  ["rpm", 1],
  ["appimage", 2],
  ["pkg", 3],
  ["msi", 3],
  ["zip", 4],
  ["tar.gz", 5],
  ["tgz", 5],
]);

const DOWNLOAD_CATALOG = [
  {
    os: "macOS",
    key: "macos",
    arch: "Apple Silicon / Intel",
    description: "适配 macOS 原生桌面体验，终端、SFTP 与连接管理一体化。",
    variants: [
      {
        key: "appleSilicon",
        arch: "arm64",
        label: "Apple Silicon",
        note: "适用于 M 系列芯片 Mac",
      },
      {
        key: "intel",
        arch: "x64",
        label: "Intel",
        note: "适用于 Intel 芯片 Mac",
      },
    ],
  },
  {
    os: "Windows",
    key: "windows",
    arch: "x64",
    description: "面向 Windows 工作流优化，快速连接远程主机与管理文件。",
    variants: [
      {
        key: "x64",
        arch: "x64",
        label: "Windows x64",
        note: "适用于 64 位 Windows",
      },
    ],
  },
  {
    os: "Linux",
    key: "linux",
    arch: "x64 / arm64",
    description: "支持主流 Linux 发行版，适合开发、运维和服务器管理场景。",
    variants: [
      {
        key: "x64",
        arch: "x64",
        label: "Linux x64",
        note: "适用于 x86_64 发行版",
      },
      {
        key: "arm64",
        arch: "arm64",
        label: "Linux arm64",
        note: "适用于 aarch64 / arm64 设备",
      },
    ],
  },
];

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const resolveDownloadUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|\/\/|\/|data:|blob:)/i.test(raw)) return raw;
  return `${DOWNLOAD_DIRECTORY}/${raw.split("/").map(encodeURIComponent).join("/")}`;
};

const normalizePlatform = (entry) => {
  const source = normalizeToken(
    entry.platform || entry.os || entry.system || entry.target || entry.file || entry.filename || entry.url,
  );

  if (source.includes("mac") || source.includes("darwin") || source.includes("osx")) return "macos";
  if (source.includes("win")) return "windows";
  if (source.includes("linux") || source.includes("appimage") || source.endsWith(".deb") || source.endsWith(".rpm")) {
    return "linux";
  }

  return "";
};

const normalizeArch = (entry) => {
  const source = normalizeToken(
    entry.arch || entry.architecture || entry.variant || entry.label || entry.file || entry.filename || entry.url,
  );

  if (source.includes("arm64") || source.includes("aarch64") || source.includes("apple-silicon")) return "arm64";
  if (source.includes("x64") || source.includes("x86-64") || source.includes("amd64") || source.includes("intel")) {
    return "x64";
  }

  return "";
};

const normalizePackageFormat = (entry) => {
  const source = normalizeToken(entry.format || entry.type || entry.package || entry.file || entry.filename || entry.url);

  if (source.endsWith(".tar.gz")) return "tar.gz";

  const match = source.match(/\.([a-z0-9]+)$/);
  const extension = match ? match[1] : source;

  if (extension === "appimage") return "appimage";
  if (PACKAGE_FORMAT_LABELS[extension]) return extension;

  return "";
};

const compareVersions = (left = "", right = "") => {
  const leftParts = String(left).match(/\d+/g)?.map(Number) || [];
  const rightParts = String(right).match(/\d+/g)?.map(Number) || [];
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta) return delta;
  }

  return 0;
};

const isNewerEntry = (candidate, current) => {
  if (!current) return true;

  const versionDelta = compareVersions(candidate.version, current.version);
  if (versionDelta) return versionDelta > 0;

  return String(candidate.updatedAt || "") > String(current.updatedAt || "");
};

const selectLatestInstallers = (entries) => {
  const latest = new Map();

  entries.forEach((entry) => {
    const key = `${entry.platform}:${entry.variantKey}:${entry.format || "installer"}`;
    const current = latest.get(key);

    if (isNewerEntry(entry, current)) {
      latest.set(key, entry);
    }
  });

  return [...latest.values()];
};

const formatRank = (format) => PACKAGE_FORMAT_ORDER.get(format) ?? 99;

const normalizeManifestEntry = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const platform = normalizePlatform(entry);
  const arch = normalizeArch(entry);
  const format = normalizePackageFormat(entry);
  const rawUrl = entry.url || entry.href || entry.file || entry.filename;

  if (!platform || !arch || !rawUrl) return null;

  const variantKey = platform === "macos" ? (arch === "arm64" ? "appleSilicon" : "intel") : arch;

  return {
    id: `${platform}:${variantKey}:${format || rawUrl}`,
    platform,
    arch,
    format,
    variantKey,
    label: entry.label || "",
    note: entry.note || "",
    size: entry.size || "",
    md5: entry.md5 || "",
    url: resolveDownloadUrl(rawUrl),
    updatedAt: entry.updatedAt || "",
    version: entry.version || "",
  };
};

const buildDownloads = (files = []) => {
  const entries = selectLatestInstallers(files
    .map(normalizeManifestEntry)
    .filter(Boolean));

  return DOWNLOAD_CATALOG.map((download) => {
    const variants = download.variants.flatMap((variant) => {
      const matches = entries
        .filter((entry) => entry.platform === download.key && entry.variantKey === variant.key)
        .sort((left, right) => formatRank(left.format) - formatRank(right.format));

      if (!matches.length) {
        return {
          ...variant,
          id: `${download.key}:${variant.key}:pending`,
          ready: false,
          url: "",
          version: "",
        };
      }

      return matches.map((entry) => {
        const formatLabel = PACKAGE_FORMAT_LABELS[entry.format] || entry.format?.toUpperCase() || "";
        const meta = [entry.version, entry.size].filter(Boolean).join(" · ");
        const label = entry.label || [variant.label, download.key === "linux" ? formatLabel : ""].filter(Boolean).join(" ");
        const note = [
          entry.note || PACKAGE_FORMAT_NOTES[entry.format] || variant.note,
          meta,
        ].filter(Boolean).join(" · ");

        return {
          ...variant,
          id: entry.id,
          label,
          md5: entry.md5,
          note,
          ready: Boolean(entry.url),
          url: entry.url,
          version: entry.version || "",
        };
      });
    });

    return {
      ...download,
      variants,
      ready: variants.some((variant) => variant.ready),
    };
  });
};

const manifestFiles = (manifest) => {
  if (Array.isArray(manifest)) return manifest;
  if (manifest && Array.isArray(manifest.files)) return manifest.files;
  return [];
};

const manifestRelease = (manifest) => {
  if (!manifest || typeof manifest.release !== "object") return {};

  return Object.fromEntries(
    Object.entries(manifest.release).filter(([, value]) => Boolean(value)),
  );
};

const { createApp } = Vue;

createApp({
  data() {
    const release = {
      version: "最新版",
      channel: "Stable",
    };

    const siteInfo = {
      ...SITE_INFO,
      year: new Date().getFullYear(),
    };

    const downloads = buildDownloads();

    return {
      isScrolled: false,
      showBackToTop: false,
      toastVisible: false,
      downloadPicker: null,
      motionObserver: null,
      release,
      siteInfo,
      downloads,
      navItems: [
        { label: "能力", href: "#features" },
        { label: "产品", href: "#product" },
        { label: "安全", href: "#security" },
        { label: "下载", href: "#download" },
      ],
      platforms: [
        { name: "macOS", key: "macos" },
        { name: "Windows", key: "windows" },
        { name: "Linux", key: "linux" },
      ],
      heroMetrics: [
        { icon: "zap", title: "高效连接", copy: "快速连接，稳定可靠" },
        { icon: "folder-cog", title: "智能管理", copy: "可视化管理文件与会话" },
        { icon: "shield-check", title: "安全加密", copy: "多重保护，放心使用" },
        { icon: "monitor-cog", title: "跨平台支持", copy: "Mac / Windows / Linux" },
      ],
      features: [
        {
          icon: "workflow",
          title: "智能连接管理",
          copy: "SSH、Jump Host、端口代理、SFTP 统一收藏，基础设施入口一处管理。",
        },
        {
          icon: "folder-kanban",
          title: "可视化文件管理",
          copy: "本地与远程文件并排展示，上传、下载、编辑、重命名操作更直接。",
        },
        {
          icon: "terminal",
          title: "强大的终端体验",
          copy: "多标签、主题定制、智能补全与快捷键面板让命令操作更流畅。",
        },
        {
          icon: "lock-keyhole",
          title: "安全与隐私",
          copy: "支持密钥、Agent 转发和加密传输，连接边界清晰可靠。",
        },
        {
          icon: "route",
          title: "端口代理",
          copy: "本地端口转发、动态代理、多级跳板，复杂网络也能快速抵达。",
        },
        {
          icon: "settings-2",
          title: "系统原生体验",
          copy: "围绕 macOS、Windows、Linux 桌面习惯设计，跨平台保持一致手感。",
        },
      ],
      terminalHighlights: [
        { icon: "panels-top-left", title: "多标签工作台", copy: "会话、SFTP、代理面板并行运行。" },
        { icon: "keyboard", title: "快捷键面板", copy: "常用操作一目了然，减少重复点击。" },
        { icon: "activity", title: "状态监控", copy: "CPU、内存、上下行速率实时可见。" },
      ],
      terminalLines: [
        "ssh deploy@10.0.8.21",
        "connected via jump-host / cn-shanghai-edge",
        "pm2 restart api-gateway --update-env",
        "sftp sync ./dist -> /var/www/orca",
        "health check passed in 184ms",
        "port forward 127.0.0.1:5432 -> remote:5432",
      ],
      shortcuts: [
        { action: "新建标签页", key: "Cmd+T" },
        { action: "本地终端", key: "Cmd+L" },
        { action: "端口代理", key: "Cmd+P" },
        { action: "SFTP", key: "Cmd+Shift+S" },
      ],
      localFiles: [
        { icon: "folder", name: "dist", size: "4.8 MB" },
        { icon: "folder", name: "assets", size: "1.2 MB" },
        { icon: "file-code-2", name: "package.json", size: "3 KB" },
        { icon: "file-text", name: "release-notes.md", size: "8 KB" },
      ],
      remoteFiles: [
        { icon: "folder", name: "public", size: "--" },
        { icon: "folder", name: "logs", size: "--" },
        { icon: "file-lock-2", name: ".env.production", size: "1 KB" },
        { icon: "file-code-2", name: "server.js", size: "18 KB" },
      ],
      securityPoints: ["SFTP 加密传输", "SSH 密钥认证", "Agent 转发", "本地私钥管理"],
    };
  },
  mounted() {
    this.setScrollState();
    window.addEventListener("scroll", this.setScrollState, { passive: true });
    this.renderLucideIcons();
    this.setupScrollMotion();
    this.loadDownloadManifest();
    window.addEventListener("load", this.revealVisibleMotionItems, { once: true });
    window.addEventListener("resize", this.setScrollState, { passive: true });
    window.addEventListener("resize", this.revealVisibleMotionItems, { passive: true });
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.setScrollState);
    window.removeEventListener("resize", this.setScrollState);
    window.removeEventListener("resize", this.revealVisibleMotionItems);
    if (this.motionObserver) {
      this.motionObserver.disconnect();
    }
  },
  methods: {
    setScrollState() {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      this.isScrolled = scrollY > 18;
      this.showBackToTop = scrollY > Math.max(420, viewportHeight * 0.72);
    },
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#top`);
      }
    },
    renderLucideIcons() {
      this.$nextTick(() => {
        if (!window.lucide) return;
        window.lucide.createIcons({
          attrs: {
            "stroke-width": 1.8,
            "aria-hidden": "true",
          },
        });
      });
    },
    setupScrollMotion() {
      this.$nextTick(() => {
        const items = [...document.querySelectorAll(".motion-reveal")];
        if (!items.length) return;
        this.revealVisibleMotionItems();

        if (!("IntersectionObserver" in window)) {
          items.forEach((item) => item.classList.add("is-visible"));
          return;
        }

        this.motionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              this.motionObserver.unobserve(entry.target);
            });
          },
          {
            threshold: 0.01,
            rootMargin: "0px 0px 18% 0px",
          },
        );

        items.forEach((item) => this.motionObserver.observe(item));
      });
    },
    revealVisibleMotionItems() {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportBottom = viewportHeight + 96;

      document.querySelectorAll(".motion-reveal:not(.is-visible)").forEach((item) => {
        const rect = item.getBoundingClientRect();
        const isVisibleNow = rect.top < viewportBottom && rect.bottom > -96;

        if (!isVisibleNow) return;
        item.classList.add("is-visible");

        if (this.motionObserver) {
          this.motionObserver.unobserve(item);
        }
      });
    },
    async loadDownloadManifest() {
      try {
        const manifestUrl = `${DOWNLOAD_MANIFEST_URL}?t=${Date.now()}`;
        const response = await fetch(manifestUrl, { cache: "no-store" });
        if (!response.ok) return;

        const manifest = await response.json();
        const files = manifestFiles(manifest);

        if (files.length) {
          this.downloads = buildDownloads(files);
        }

        this.release = {
          ...this.release,
          ...manifestRelease(manifest),
        };
      } catch (error) {
        console.warn("Download manifest could not be loaded.", error);
      }
    },
    downloadStatus(download) {
      const readyCount = download.variants.filter((variant) => variant.ready).length;
      if (readyCount === download.variants.length) return "可下载";
      if (readyCount > 0) return "部分可下载";
      return "即将开放";
    },
    downloadVersion(download) {
      const versions = [
        ...new Set(download.variants
          .filter((variant) => variant.ready && variant.version)
          .map((variant) => variant.version)),
      ];

      if (versions.length === 1) return versions[0];
      if (versions.length > 1) return "多个版本";
      return "待发布";
    },
    downloadActionLabel(download) {
      return download.ready ? "选择下载版本" : "查看下载状态";
    },
    handleDownload(download) {
      this.downloadPicker = download;
    },
    guardVariantDownload(event, variant) {
      if (variant.ready) {
        this.downloadPicker = null;
        return;
      }

      event.preventDefault();
      this.showDownloadToast();
    },
    closeDownloadPicker() {
      this.downloadPicker = null;
    },
    showDownloadToast() {
      this.toastVisible = true;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        this.toastVisible = false;
      }, 2600);
    },
  },
}).mount("#app");
