import { JSX } from "react";

export function formatString(stringToFormat: string | undefined): JSX.Element | string | undefined {
    if (stringToFormat) {
      const paragraphs = stringToFormat.split('\n\n');
      const lastParagraph = paragraphs.pop();
  
      if (typeof lastParagraph === 'string') {
        const listItems = lastParagraph.split('\n').filter((line) => {
          return /^(?:[•\-\*\d]+\.|\d+\)|🔹)\s/.test(line);
        });
        const remainingParagraph = lastParagraph
          .split('\n')
          .filter((line) => !/^(?:[•\-\*\d]+\.|\d+\)|🔹)\s/.test(line))
          .join('\n');
  
        return (
          <div>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {remainingParagraph && <p style={{whiteSpace: 'pre-line'}}>{remainingParagraph}</p>}
            {listItems.length > 0 && (
              <ul>
                {listItems.map((item, index) => (
                  <li key={index}>{item.replace(/^(?:[•\-\*\d]+\.|\d+\)|🔹)\s/, '')}</li>
                ))}
              </ul>
            )}
          </div>
        );
      } else {
          return (
              <div>
                  {paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                  ))}
              </div>
          );
      }
    } else {
      return stringToFormat;
    }
  }