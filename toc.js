// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">TiDB Development Guide</a></li><li class="chapter-item expanded "><a href="get-started/introduction.html"><strong aria-hidden="true">1.</strong> Get Started</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="get-started/install-golang.html"><strong aria-hidden="true">1.1.</strong> Install Golang</a></li><li class="chapter-item expanded "><a href="get-started/build-tidb-from-source.html"><strong aria-hidden="true">1.2.</strong> Get the code, build and run</a></li><li class="chapter-item expanded "><a href="get-started/setup-an-ide.html"><strong aria-hidden="true">1.3.</strong> Setup an IDE</a></li><li class="chapter-item expanded "><a href="get-started/write-and-run-unit-tests.html"><strong aria-hidden="true">1.4.</strong> Write and run unit tests</a></li><li class="chapter-item expanded "><a href="get-started/debug-and-profile.html"><strong aria-hidden="true">1.5.</strong> Debug and profile</a></li><li class="chapter-item expanded "><a href="get-started/commit-code-and-submit-a-pull-request.html"><strong aria-hidden="true">1.6.</strong> Commit code and submit a pull request</a></li></ol></li><li class="chapter-item expanded "><a href="contribute-to-tidb/introduction.html"><strong aria-hidden="true">2.</strong> Contribute to TiDB</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="contribute-to-tidb/community-guideline.html"><strong aria-hidden="true">2.1.</strong> Community Guideline</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/report-an-issue.html"><strong aria-hidden="true">2.2.</strong> Report an Issue</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/issue-triage.html"><strong aria-hidden="true">2.3.</strong> Issue Triage</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/contribute-code.html"><strong aria-hidden="true">2.4.</strong> Contribute Code</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/cherrypick-a-pr.html"><strong aria-hidden="true">2.5.</strong> Cherry-pick a Pull Request</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/review-a-pr.html"><strong aria-hidden="true">2.6.</strong> Review a Pull Request</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/make-a-proposal.html"><strong aria-hidden="true">2.7.</strong> Make a Proposal</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/code-style-and-quality-guide.html"><strong aria-hidden="true">2.8.</strong> Code Style and Quality Guide</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/write-document.html"><strong aria-hidden="true">2.9.</strong> Write Document</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/release-notes-style-guide.html"><strong aria-hidden="true">2.10.</strong> Release Notes Language Style Guide</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/committer-guide.html"><strong aria-hidden="true">2.11.</strong> Committer Guide</a></li><li class="chapter-item expanded "><a href="contribute-to-tidb/miscellaneous-topics.html"><strong aria-hidden="true">2.12.</strong> Miscellaneous Topics</a></li></ol></li><li class="chapter-item expanded "><a href="understand-tidb/introduction.html"><strong aria-hidden="true">3.</strong> Understand TiDB</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/the-lifecycle-of-a-statement.html"><strong aria-hidden="true">3.1.</strong> The Lifecycle of a Statement</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/ddl.html"><strong aria-hidden="true">3.1.1.</strong> DDL</a></li><li class="chapter-item expanded "><a href="understand-tidb/dml.html"><strong aria-hidden="true">3.1.2.</strong> DML</a></li><li class="chapter-item expanded "><a href="understand-tidb/dql.html"><strong aria-hidden="true">3.1.3.</strong> DQL</a></li></ol></li><li class="chapter-item expanded "><a href="understand-tidb/parser.html"><strong aria-hidden="true">3.2.</strong> Parser</a></li><li class="chapter-item expanded "><a href="understand-tidb/planner.html"><strong aria-hidden="true">3.3.</strong> Planner</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/table-statistics.html"><strong aria-hidden="true">3.3.1.</strong> Table Statistics</a></li><li class="chapter-item expanded "><a href="understand-tidb/rbo.html"><strong aria-hidden="true">3.3.2.</strong> Rule-based Optimization</a></li><li class="chapter-item expanded "><a href="understand-tidb/cbo.html"><strong aria-hidden="true">3.3.3.</strong> Cost-based Optimization</a></li><li class="chapter-item expanded "><a href="understand-tidb/plan-cache.html"><strong aria-hidden="true">3.3.4.</strong> Plan Cache</a></li><li class="chapter-item expanded "><a href="understand-tidb/sql-plan-management.html"><strong aria-hidden="true">3.3.5.</strong> SQL Plan Management</a></li></ol></li><li class="chapter-item expanded "><a href="understand-tidb/execution.html"><strong aria-hidden="true">3.4.</strong> Execution</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/parallel-execution-framework.html"><strong aria-hidden="true">3.4.1.</strong> Parallel Execution Framework</a></li><li class="chapter-item expanded "><a href="understand-tidb/implementation-of-vectorized-execution.html"><strong aria-hidden="true">3.4.2.</strong> Implementation of Vectorized Execution</a></li><li class="chapter-item expanded "><a href="understand-tidb/memory-management-mechanism.html"><strong aria-hidden="true">3.4.3.</strong> Memory Management Mechanism</a></li><li class="chapter-item expanded "><a href="understand-tidb/implementation-of-typical-operators.html"><strong aria-hidden="true">3.4.4.</strong> Implementation of Typical Operators</a></li></ol></li><li class="chapter-item expanded "><a href="understand-tidb/transaction.html"><strong aria-hidden="true">3.5.</strong> Transaction</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/transaction-on-tikv.html"><strong aria-hidden="true">3.5.1.</strong> Transaction on TiKV</a></li><li class="chapter-item expanded "><a href="understand-tidb/optimistic-transaction.html"><strong aria-hidden="true">3.5.2.</strong> Optimistic Transaction</a></li><li class="chapter-item expanded "><a href="understand-tidb/lock-resolver.html"><strong aria-hidden="true">3.5.3.</strong> Lock Resolver</a></li><li class="chapter-item expanded "><a href="understand-tidb/pessimistic-transaction.html"><strong aria-hidden="true">3.5.4.</strong> Pessimistic Transaction</a></li><li class="chapter-item expanded "><a href="understand-tidb/async-commit.html"><strong aria-hidden="true">3.5.5.</strong> Async Commit</a></li><li class="chapter-item expanded "><a href="understand-tidb/1pc.html"><strong aria-hidden="true">3.5.6.</strong> 1PC</a></li><li class="chapter-item expanded "><a href="understand-tidb/mvcc-garbage-collection.html"><strong aria-hidden="true">3.5.7.</strong> MVCC garbage collection</a></li></ol></li><li class="chapter-item expanded "><a href="understand-tidb/session.html"><strong aria-hidden="true">3.6.</strong> Session</a></li><li class="chapter-item expanded "><a href="understand-tidb/privilege.html"><strong aria-hidden="true">3.7.</strong> Privilege</a></li><li class="chapter-item expanded "><a href="understand-tidb/plugin.html"><strong aria-hidden="true">3.8.</strong> Plugin</a></li><li class="chapter-item expanded "><a href="understand-tidb/system-tables/introduction.html"><strong aria-hidden="true">3.9.</strong> System tables</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/system-tables/information_schema/introduction.html"><strong aria-hidden="true">3.9.1.</strong> information_schema</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="understand-tidb/system-tables/information_schema/slow_query.html"><strong aria-hidden="true">3.9.1.1.</strong> slow_query</a></li></ol></li></ol></li></ol></li><li class="chapter-item expanded "><a href="project-management/introduction.html"><strong aria-hidden="true">4.</strong> Project Management</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="project-management/release-train-model.html"><strong aria-hidden="true">4.1.</strong> Releases Train Model</a></li><li class="chapter-item expanded "><a href="project-management/tidb-versioning.html"><strong aria-hidden="true">4.2.</strong> TiDB Versioning</a></li></ol></li><li class="chapter-item expanded "><a href="extending-tidb/introduction.html"><strong aria-hidden="true">5.</strong> Extending TiDB</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="extending-tidb/add-a-function.html"><strong aria-hidden="true">5.1.</strong> Add a function</a></li></ol></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString();
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
