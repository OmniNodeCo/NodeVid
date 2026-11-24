import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ALL, COUNTS, archiveUrl } from '../lib/catalog.js';
import { LICENSES } from '../lib/library.js';

export default function About() {
  useEffect(() => {
    document.title = 'About & Legal — NodeVid';
  }, []);
  const open = ALL.filter((x) => x.license !== 'pd');

  return (
    <div className="container page-pad narrow about">
      <h1>About NodeVid</h1>
      <p className="lead">
        NodeVid is a free, Netflix-style way to watch classic films and TV that anyone may legally share. Every one of its {COUNTS.movies} films and {COUNTS.series} series is either in the{' '}
        <strong>public domain in the United States</strong> or released by its creators under a <strong>Creative Commons</strong> licence.
      </p>

      <section className="panel">
        <h2>Where the videos come from</h2>
        <p>
          All video streams directly from the{' '}
          <a href="https://archive.org" target="_blank" rel="noreferrer">
            Internet Archive
          </a>
          , a non-profit digital library. NodeVid doesn&apos;t host, upload or re-encode anything: it plays the Archive&apos;s own files in your browser&apos;s built-in video player. There are no
          third-party streaming embeds and no ads, and no account or API key is needed.
        </p>
      </section>

      <section className="panel">
        <h2>How titles are chosen</h2>
        <p>Public-domain labels on the Internet Archive are set by uploaders and are sometimes wrong, so NodeVid doesn&apos;t simply show everything marked &ldquo;public domain&rdquo;. Each title was hand-picked because its status is well documented:</p>
        <ul>
          <li>
            <strong>Published before 1931.</strong> US copyright on these works has expired.
          </li>
          <li>
            <strong>US films from 1931–1963 that were never renewed.</strong> Copyright at the time lasted 28 years unless it was renewed; many films never were (for example <em>His Girl Friday</em>, <em>Detour</em> and <em>McLintock!</em>).
          </li>
          <li>
            <strong>US works published without a copyright notice</strong>, which was required until 1989 (for example <em>Night of the Living Dead</em> and <em>Charade</em>).
          </li>
          <li>
            <strong>Open movies</strong> released by their creators under CC0 or CC BY.
          </li>
        </ul>
        <p>
          Foreign sound films from 1931 on are left out, because many had their US copyright restored in 1996. Public-domain status depends on the country: titles here are public domain in the United States, but may still be protected elsewhere.
        </p>
        <p>
          Spotted a title that shouldn&apos;t be here?{' '}
          <a href="https://github.com/OmniNodeCo/NodeVid/issues" target="_blank" rel="noreferrer">
            Open an issue
          </a>{' '}
          and it will be removed.
        </p>
      </section>

      <section className="panel">
        <h2>Public Domain Day</h2>
        <p>
          Every January 1, another year of works enters the US public domain. On January 1, 2027, films from 1931 such as <em>Frankenstein</em>, <em>Dracula</em> and <em>City Lights</em> join them. Find them under{' '}
          <Link to="/new">New &amp; Popular → Coming Soon</Link>. They can&apos;t be streamed legally before then.
        </p>
      </section>

      <section className="panel">
        <h2>Credits for Creative Commons titles</h2>
        <ul className="credits">
          {open.map((x) => (
            <li key={x.id}>
              <Link to={`/${x.type}/${x.id}`}>{x.title}</Link> ({x.year}): {x.credit || LICENSES[x.license].label}.{' '}
              <a href={LICENSES[x.license].url} target="_blank" rel="noreferrer">
                {LICENSES[x.license].short}
              </a>{' '}
              ·{' '}
              <a href={archiveUrl(x.archiveId)} target="_blank" rel="noreferrer">
                source
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="fineprint">
        NodeVid isn&apos;t affiliated with the Internet Archive, Netflix, or any rights holder. Title descriptions are original to NodeVid; thumbnails come from the Internet Archive item for each title. This
        page is general information, not legal advice.
      </p>
    </div>
  );
}
