import { Card, CardHeader, CardBody } from '@heroui/react';
import FadeInAnimation from '../FadeInAnimation';
import styles from './problemSection.module.css';

/**
 * ProblemSection - Displays a grid of problem cards highlighting pain points
 * @param {Object} props
 * @param {Array} props.cards - Array of problem card objects with id, icon, headline, body
 * @returns {JSX.Element}
 */
const ProblemSection = ({ cards }) => {
  return (
    <FadeInAnimation id="problems">
      <div className={styles.problemSection}>
        <h2>
          You don't know what you don't know.
          <br />
          And it's costing you.
        </h2>

        <div className={styles.cardsContainer}>
          <div className={styles.cardsGrid}>
            {cards.map((card) => (
              <Card 
                key={card.id} 
                className={styles.heroCard}
                shadow="sm"
                radius="lg"
              >
                <CardHeader className="flex gap-3 pb-0">
                  <div className={styles.cardIconWrapper}>{card.icon}</div>
                  <p className={styles.cardHeadline}>{card.headline}</p>
                </CardHeader>
                <CardBody className="pt-2">
                  <p className={styles.cardBody}>{card.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </FadeInAnimation>
  );
};

export default ProblemSection;
