import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'content/posts');

function ensurePostsDirectory() {
    if (!fs.existsSync(postsDirectory)) {
        fs.mkdirSync(postsDirectory, { recursive: true });
    }
}

export function getAllPostSlugs() {
    ensurePostsDirectory();
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''));
}

export function getPostBySlug(slug) {
    ensurePostsDirectory();
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Extract wiki-links [[target]] or [[target|display]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links = [];
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
        links.push({
            target: match[1].trim(),
            display: match[2] ? match[2].trim() : match[1].trim(),
        });
    }

    return {
        slug,
        links,
        thumbnail: data.thumbnail || data.image || getFirstMarkdownImage(content),
        ...data,
        content,
    };
}

function getFirstMarkdownImage(content) {
    const imageMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return imageMatch ? imageMatch[1].trim() : '';
}

export async function getPostWithHtml(slug) {
    const post = getPostBySlug(slug);
    if (!post) return null;

    // Replace wiki-links with HTML links before markdown processing
    let processedContent = post.content.replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (match, target, display) => {
            const targetSlug = target.trim().toLowerCase().replace(/\s+/g, '-');
            const displayText = display ? display.trim() : target.trim();
            return `[${displayText}](/blog/${targetSlug})`;
        }
    );

    const result = await remark()
        .use(remarkGfm)
        .use(html, { sanitize: false })
        .process(processedContent);

    return {
        ...post,
        contentHtml: highlightCodeBlocks(result.toString()),
    };
}

const JVM_KEYWORDS = new Set([
    'abstract',
    'actual',
    'annotation',
    'as',
    'break',
    'by',
    'catch',
    'class',
    'companion',
    'const',
    'constructor',
    'continue',
    'data',
    'default',
    'do',
    'dynamic',
    'else',
    'enum',
    'expect',
    'extends',
    'external',
    'final',
    'finally',
    'for',
    'fun',
    'if',
    'implements',
    'import',
    'in',
    'inline',
    'inner',
    'interface',
    'internal',
    'is',
    'new',
    'object',
    'open',
    'operator',
    'out',
    'override',
    'package',
    'private',
    'protected',
    'public',
    'reified',
    'return',
    'sealed',
    'static',
    'super',
    'suspend',
    'switch',
    'this',
    'throw',
    'throws',
    'try',
    'typealias',
    'val',
    'var',
    'void',
    'when',
    'where',
    'while',
]);

const JVM_LITERALS = new Set(['false', 'null', 'true']);

function highlightCodeBlocks(contentHtml) {
    return contentHtml.replace(
        /<pre><code class="language-(kotlin|java)">([\s\S]*?)<\/code><\/pre>/g,
        (match, language, code) => {
            const highlightedCode = highlightJvmCode(decodeHtml(code));
            return `<pre class="code-block code-block-${language}" data-language="${language.toUpperCase()}"><code class="language-${language} syntax-highlighted">${highlightedCode}</code></pre>`;
        }
    );
}

function highlightJvmCode(code) {
    let highlighted = '';
    let index = 0;
    let expectsTypeName = false;

    while (index < code.length) {
        const char = code[index];
        const next = code[index + 1];

        if (char === '/' && next === '/') {
            const end = code.indexOf('\n', index);
            const tokenEnd = end === -1 ? code.length : end;
            highlighted += wrapToken('comment', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (char === '/' && next === '*') {
            const end = code.indexOf('*/', index + 2);
            const tokenEnd = end === -1 ? code.length : end + 2;
            highlighted += wrapToken('comment', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (code.startsWith('"""', index)) {
            const end = code.indexOf('"""', index + 3);
            const tokenEnd = end === -1 ? code.length : end + 3;
            highlighted += wrapToken('string', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (char === '"' || char === "'") {
            const tokenEnd = readQuotedToken(code, index, char);
            highlighted += wrapToken('string', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (char === '@' && isIdentifierStart(code[index + 1])) {
            const tokenEnd = readIdentifier(code, index + 1);
            highlighted += wrapToken('annotation', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (isDigit(char)) {
            const tokenEnd = readNumber(code, index);
            highlighted += wrapToken('number', code.slice(index, tokenEnd));
            index = tokenEnd;
            continue;
        }

        if (isIdentifierStart(char)) {
            const tokenEnd = readIdentifier(code, index);
            const token = code.slice(index, tokenEnd);
            if (JVM_KEYWORDS.has(token)) {
                highlighted += wrapToken('keyword', token);
                expectsTypeName = ['annotation', 'class', 'enum', 'interface', 'object'].includes(token);
            } else if (expectsTypeName) {
                highlighted += wrapToken('type', token);
                expectsTypeName = false;
            } else if (JVM_LITERALS.has(token)) {
                highlighted += wrapToken('literal', token);
            } else if (isLikelyFunction(code, tokenEnd)) {
                highlighted += wrapToken('function', token);
            } else if (/^[A-Z]/.test(token)) {
                highlighted += wrapToken('type', token);
            } else {
                highlighted += escapeHtml(token);
            }
            index = tokenEnd;
            continue;
        }

        if (/[{}()[\].,;:+\-*/%=&|!<>?]/.test(char)) {
            highlighted += wrapToken('operator', char);
            index += 1;
            continue;
        }

        highlighted += escapeHtml(char);
        index += 1;
    }

    return highlighted;
}

function readQuotedToken(code, start, quote) {
    let index = start + 1;
    while (index < code.length) {
        if (code[index] === '\\') {
            index += 2;
            continue;
        }
        if (code[index] === quote) {
            return index + 1;
        }
        index += 1;
    }
    return code.length;
}

function readIdentifier(code, start) {
    let index = start;
    while (index < code.length && isIdentifierPart(code[index])) {
        index += 1;
    }
    return index;
}

function readNumber(code, start) {
    let index = start;
    while (index < code.length && /[A-Za-z0-9_.]/.test(code[index])) {
        index += 1;
    }
    return index;
}

function isLikelyFunction(code, tokenEnd) {
    let index = tokenEnd;
    while (index < code.length && /\s/.test(code[index])) {
        index += 1;
    }
    return code[index] === '(';
}

function isIdentifierStart(char) {
    return /[A-Za-z_]/.test(char || '');
}

function isIdentifierPart(char) {
    return /[A-Za-z0-9_]/.test(char || '');
}

function isDigit(char) {
    return /[0-9]/.test(char || '');
}

function wrapToken(type, token) {
    return `<span class="syntax-${type}">${escapeHtml(token)}</span>`;
}

function decodeHtml(value) {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal) => String.fromCharCode(parseInt(decimal, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function getAllPosts() {
    const slugs = getAllPostSlugs();
    const posts = slugs
        .map((slug) => getPostBySlug(slug))
        .filter((post) => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1));
    return posts;
}

export function getGraphData() {
    const posts = getAllPosts();
    const slugMap = new Map(posts.map((p) => [p.slug, p]));

    const nodes = posts.map((post) => ({
        id: post.slug,
        title: post.title || post.slug,
        category: post.category || 'Uncategorized',
        date: post.date || '',
    }));

    const links = [];
    const linkSet = new Set();

    posts.forEach((post) => {
        post.links.forEach((link) => {
            const targetSlug = link.target.toLowerCase().replace(/\s+/g, '-');
            if (slugMap.has(targetSlug)) {
                const key = [post.slug, targetSlug].sort().join('->');
                if (!linkSet.has(key)) {
                    linkSet.add(key);
                    links.push({
                        source: post.slug,
                        target: targetSlug,
                    });
                }
            }
        });
    });

    return { nodes, links };
}
