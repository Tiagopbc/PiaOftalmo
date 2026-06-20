import { CheckCircle2, Circle } from 'lucide-react';
import { getPasswordRequirements } from '../utils/passwords';

export const PasswordRequirements = ({ password, confirmation = null }) => {
  const requirements = getPasswordRequirements(password);
  const visibleRequirements = confirmation === null
    ? requirements
    : [
        ...requirements,
        {
          id: 'confirmation',
          label: 'As duas senhas são iguais',
          met: confirmation.length > 0 && password === confirmation
        }
      ];

  return (
    <section className="password-requirements" aria-label="Requisitos da senha">
      <strong>A senha precisa ter:</strong>
      <ul>
        {visibleRequirements.map((requirement) => (
          <li
            key={requirement.id}
            className={requirement.met ? 'is-met' : 'is-pending'}
            aria-label={`${requirement.label}: ${requirement.met ? 'atendido' : 'pendente'}`}
          >
            {requirement.met
              ? <CheckCircle2 size={15} aria-hidden="true" />
              : <Circle size={15} aria-hidden="true" />}
            <span>{requirement.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
